export const DEFAULT_SETTINGS = {
    assistantName: undefined,
    unresolvedApiKeyRef: undefined,
    assistantDescription: "A helpful assistant that takes part in this chat. It answers questions and requests directed at it.",
    bufferSize: 8,
    replyGate: {
        enabled: true,
        mentionPatterns: [],
        threshold: 0.6,
        evaluateDirectMessages: false,
        failOpen: true,
    },
    modelRouter: {
        enabled: false,
        tiers: { light: undefined, standard: undefined, heavy: undefined },
        lightBelow: 0.34,
        // Effort has four levels, so level 2 lands on 0.67. Heavy means leaning towards level 3.
        heavyAbove: 0.8,
        minConfidence: 0.5,
        maxPromptChars: 4000,
    },
    baseUrl: "https://api.typesafe.ai",
    model: "jev-latest",
    timeoutMs: 2500,
};
function readString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function readNumber(value, min, max) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
    }
    return Math.min(max, Math.max(min, value));
}
function readBoolean(value) {
    return typeof value === "boolean" ? value : undefined;
}
function readObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function readStringList(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const items = value.map(readString).filter((item) => item !== undefined);
    return items;
}
/**
 * The host resolves SecretRefs declared in the manifest's `configContracts.secretInputs` before
 * the plugin sees its config, so a resolved `apiKey` arrives as a plain string. An object that is
 * still ref-shaped means resolution failed.
 */
function readUnresolvedSecretRef(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return undefined;
    }
    const ref = value;
    if (typeof ref.source !== "string" || typeof ref.id !== "string") {
        return undefined;
    }
    return { source: ref.source, provider: typeof ref.provider === "string" ? ref.provider : "default" };
}
export function resolveSettings(pluginConfig, env = process.env) {
    const cfg = pluginConfig ?? {};
    const gate = readObject(cfg.replyGate);
    const router = readObject(cfg.modelRouter);
    const tiers = readObject(router.tiers);
    const gateDefaults = DEFAULT_SETTINGS.replyGate;
    const routerDefaults = DEFAULT_SETTINGS.modelRouter;
    return {
        assistantName: readString(cfg.assistantName),
        assistantDescription: readString(cfg.assistantDescription) ?? DEFAULT_SETTINGS.assistantDescription,
        bufferSize: Math.round(readNumber(cfg.bufferSize, 1, 50) ?? DEFAULT_SETTINGS.bufferSize),
        replyGate: {
            enabled: readBoolean(gate.enabled) ?? gateDefaults.enabled,
            mentionPatterns: readStringList(gate.mentionPatterns) ?? gateDefaults.mentionPatterns,
            threshold: readNumber(gate.threshold, 0, 1) ?? gateDefaults.threshold,
            evaluateDirectMessages: readBoolean(gate.evaluateDirectMessages) ?? gateDefaults.evaluateDirectMessages,
            failOpen: readBoolean(gate.failOpen) ?? gateDefaults.failOpen,
        },
        modelRouter: {
            enabled: readBoolean(router.enabled) ?? routerDefaults.enabled,
            tiers: {
                light: readString(tiers.light),
                standard: readString(tiers.standard),
                heavy: readString(tiers.heavy),
            },
            lightBelow: readNumber(router.lightBelow, 0, 1) ?? routerDefaults.lightBelow,
            heavyAbove: readNumber(router.heavyAbove, 0, 1) ?? routerDefaults.heavyAbove,
            minConfidence: readNumber(router.minConfidence, 0, 1) ?? routerDefaults.minConfidence,
            maxPromptChars: Math.round(readNumber(router.maxPromptChars, 200, 20_000) ?? routerDefaults.maxPromptChars),
        },
        apiKey: readString(cfg.apiKey) ?? readString(env.TYPESAFE_API_KEY),
        unresolvedApiKeyRef: readUnresolvedSecretRef(cfg.apiKey),
        apiKeyRef: readUnresolvedSecretRef(cfg.apiKey) ? cfg.apiKey : undefined,
        baseUrl: readString(cfg.baseUrl) ?? readString(env.TYPESAFE_BASE_URL) ?? DEFAULT_SETTINGS.baseUrl,
        model: readString(cfg.model) ?? readString(env.TYPESAFE_DEFAULT_MODEL) ?? DEFAULT_SETTINGS.model,
        timeoutMs: Math.round(readNumber(cfg.timeoutMs, 100, 60_000) ?? DEFAULT_SETTINGS.timeoutMs),
    };
}
