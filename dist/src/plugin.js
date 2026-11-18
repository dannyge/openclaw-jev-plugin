import { createConversationBuffer } from "./buffer.js";
import { resolveSettings } from "./config.js";
import { decideWithJev } from "./decide.js";
import { createAssistantResolver } from "./identity.js";
import { createJevClient } from "./jev-client.js";
import { routeWithJev, toModelOverride } from "./route.js";
const SILENT = { handled: true };
export function conversationKey(event, ctx) {
    return (event.sessionKey ??
        ctx.sessionKey ??
        ctx.conversationId ??
        `${ctx.channelId ?? event.channel ?? "unknown"}:${ctx.senderId ?? event.senderId ?? "unknown"}`);
}
export function registerJevGate(api, deps = {}) {
    const settings = deps.settings ?? resolveSettings(api.pluginConfig);
    const now = deps.now ?? (() => Date.now());
    const gate = settings.replyGate;
    const router = settings.modelRouter;
    const buffer = createConversationBuffer({ size: settings.bufferSize });
    const assistants = createAssistantResolver(api, {
        assistantName: settings.assistantName,
        mentionPatterns: gate.mentionPatterns,
    });
    const log = api.logger;
    if (!gate.enabled && !router.enabled) {
        log.info("jev-gate: every feature is disabled; no hooks registered");
        return { settings, buffer };
    }
    if (settings.unresolvedApiKeyRef) {
        const { source, provider } = settings.unresolvedApiKeyRef;
        log.warn(`jev-gate: config.apiKey SecretRef (source=${source}, provider=${provider}) did not resolve; ` +
            (settings.apiKey ? "falling back to TYPESAFE_API_KEY" : "check `openclaw secrets list` and the ref id"));
    }
    let jev = deps.jev;
    if (!jev) {
        if (settings.apiKey) {
            jev = createJevClient({
                apiKey: settings.apiKey,
                baseUrl: settings.baseUrl,
                model: settings.model,
                timeoutMs: settings.timeoutMs,
            });
        }
        else {
            const effects = [
                ...(gate.enabled ? [gate.failOpen ? "every message will be answered" : "only mentions will be answered"] : []),
                ...(router.enabled ? ["the model router is inactive"] : []),
            ];
            log.warn("jev-gate: no TypeSafe API key (set TYPESAFE_API_KEY or plugins.entries.jev-gate.config.apiKey, a string or SecretRef); " +
                effects.join("; "));
        }
    }
    // Runtime fallback: when the host does not pre-resolve the SecretRef into config.apiKey
    // (store entries are host-scoped), resolve it lazily through the plugin SDK on first use.
    let lazyResolveTried = false;
    async function ensureJev() {
        if (jev || deps.jev)
            return jev;
        if (lazyResolveTried || !settings.apiKeyRef)
            return jev;
        lazyResolveTried = true;
        try {
            const sdk = (await import("openclaw/plugin-sdk/secret-input"));
            const credential = sdk.resolveSecretInputString?.({
                value: settings.apiKeyRef,
                path: "plugins.entries.jev-gate.config.apiKey",
                mode: "inspect",
            });
            const value = credential && typeof credential.value === "string" ? credential.value : undefined;
            if (value) {
                jev = createJevClient({
                    apiKey: value,
                    baseUrl: settings.baseUrl,
                    model: settings.model,
                    timeoutMs: settings.timeoutMs,
                });
                log.info("jev-gate: apiKey resolved at runtime; jev client ready");
            }
        }
        catch (error) {
            log.warn(`jev-gate: runtime secret resolution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return jev;
    }
    log.info(`jev-gate: replyGate ${gate.enabled ? "on" : "off"}, modelRouter ${router.enabled ? "on" : "off"}`);
    api.on("before_dispatch", async (event, ctx) => {
        const key = conversationKey(event, ctx);
        const text = (event.body ?? event.content ?? "").trim();
        const timestamp = event.timestamp ?? now();
        buffer.append(key, {
            role: "user",
            sender: event.senderId ?? ctx.senderId ?? "unknown",
            text,
            timestamp,
        });
        if (!gate.enabled) {
            return undefined;
        }
        if (!event.isGroup && !gate.evaluateDirectMessages) {
            buffer.markLast(key, "replied");
            return undefined;
        }
        const assistant = assistants.resolve(event.sessionKey ?? ctx.sessionKey, {
            channel: ctx.channelId ?? event.channel,
            conversationId: ctx.conversationId,
        });
        if (assistant.mentions(text) || assistant.mentions(event.replyToSender)) {
            buffer.markLast(key, "mentioned");
            log.debug?.(`jev-gate: mention in ${key}, replying`);
            return undefined;
        }
        const gateClient = await ensureJev();
        if (!gateClient) {
            buffer.markLast(key, gate.failOpen ? "replied" : "stayed_silent");
            return gate.failOpen ? undefined : SILENT;
        }
        try {
            const decision = await decideWithJev(gateClient, {
                assistantName: assistant.name,
                assistantDescription: settings.assistantDescription,
                channel: ctx.channelId ?? event.channel,
                isGroup: event.isGroup ?? true,
                recent: buffer.recent(key),
                now: now(),
            }, gate.threshold);
            buffer.markLast(key, decision.reply ? "replied" : "stayed_silent");
            log.info(`jev-gate: ${decision.reply ? "reply" : "silent"} for ${key} (${decision.reason})`);
            return decision.reply ? undefined : SILENT;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log.warn(`jev-gate: Jev call failed for ${key}, ${gate.failOpen ? "replying" : "staying silent"}: ${message}`);
            buffer.markLast(key, gate.failOpen ? "replied" : "stayed_silent");
            return gate.failOpen ? undefined : SILENT;
        }
    });
    api.on("message_sent", (event) => {
        if (!event.success || !event.sessionKey) {
            return;
        }
        const text = event.content?.trim();
        if (!text) {
            return;
        }
        buffer.append(event.sessionKey, {
            role: "assistant",
            sender: assistants.resolve(event.sessionKey).name,
            text,
            timestamp: now(),
        });
    });
    if (router.enabled) {
        const { light, standard, heavy } = router.tiers;
        if (!light && !standard && !heavy) {
            log.info("jev-gate: modelRouter has no tiers configured; decisions are logged and the model is never changed");
        }
        api.on("before_model_resolve", async (event, ctx) => {
            // Cron, heartbeat, memory and overflow runs carry the host's own prompts, not a person's request.
            const routeClient = await ensureJev();
            if (!routeClient || (ctx.trigger !== undefined && ctx.trigger !== "user")) {
                return undefined;
            }
            const key = ctx.sessionKey;
            const label = key ?? ctx.runId ?? "run";
            const recent = key ? buffer.recent(key) : [];
            // The newest buffered user message is the one already in the prompt.
            const earlier = recent.at(-1)?.role === "user" ? recent.slice(0, -1) : recent;
            try {
                const decision = await routeWithJev(routeClient, {
                    assistantName: assistants.resolve(key).name,
                    assistantDescription: settings.assistantDescription,
                    channel: ctx.channelId ?? ctx.channel,
                    prompt: event.prompt,
                    attachmentKinds: (event.attachments ?? []).map((attachment) => attachment.kind),
                    recent: earlier,
                    now: now(),
                }, router);
                const target = router.tiers[decision.tier];
                log.info(`jev-gate: route ${decision.tier} -> ${target ?? "agent default"} for ${label} (${decision.reason})`);
                return toModelOverride(target);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                log.warn(`jev-gate: Jev call failed for ${label}, keeping the agent's model: ${message}`);
                return undefined;
            }
        });
    }
    return { settings, buffer };
}
