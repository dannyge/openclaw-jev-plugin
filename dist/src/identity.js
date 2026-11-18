import { createMentionMatcher } from "./mention.js";
export const FALLBACK_ASSISTANT_NAME = "assistant";
/** Mirrors the host's implicit agent id for configs without a roster. */
const IMPLICIT_AGENT_ID = "main";
const AGENT_SESSION_KEY = /^agent:([^:]+):/i;
export function agentIdFromSessionKey(sessionKey) {
    const match = AGENT_SESSION_KEY.exec(sessionKey?.trim() ?? "");
    return match ? match[1].toLowerCase() : undefined;
}
export function defaultAgentId(cfg) {
    const agents = cfg?.agents?.list ?? [];
    const agent = agents.find((entry) => entry?.default === true) ?? agents[0];
    return agent?.id?.trim().toLowerCase() || IMPLICIT_AGENT_ID;
}
export function createAssistantResolver(api, settings) {
    const extra = createMentionMatcher([
        ...(settings.assistantName ? [settings.assistantName] : []),
        ...settings.mentionPatterns,
    ]);
    return {
        resolve(sessionKey, scope = {}) {
            // Read `api.config` per message so a config reload is picked up.
            const cfg = api.config;
            const agentId = agentIdFromSessionKey(sessionKey) ?? defaultAgentId(cfg);
            const name = settings.assistantName ??
                (api.runtime.agent.resolveAgentIdentity(cfg, agentId)?.name?.trim() || FALLBACK_ASSISTANT_NAME);
            const { buildMentionRegexes, matchesMentionPatterns } = api.runtime.channel.mentions;
            let regexes;
            return {
                agentId,
                name,
                mentions(text) {
                    if (!text) {
                        return false;
                    }
                    // The host caches compiled patterns, so building them per message is cheap.
                    regexes ??= buildMentionRegexes(cfg, agentId, {
                        provider: scope.channel,
                        conversationId: scope.conversationId,
                    });
                    return matchesMentionPatterns(text, regexes) || extra.matches(text);
                },
            };
        },
    };
}
