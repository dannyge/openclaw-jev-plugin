/** Decides whether the assistant answers an incoming message. `before_dispatch`. */
export type ReplyGateSettings = {
    enabled: boolean;
    mentionPatterns: string[];
    threshold: number;
    evaluateDirectMessages: boolean;
    failOpen: boolean;
};
/** A model reference as the host writes it: `provider/model`, or a bare model id. */
export type ModelTiers = {
    light: string | undefined;
    /** Unset means the agent keeps its own configured model. */
    standard: string | undefined;
    heavy: string | undefined;
};
/** Picks a model tier per request. `before_model_resolve`. */
export type ModelRouterSettings = {
    enabled: boolean;
    tiers: ModelTiers;
    /** Effort at or below this (0 to 1) can take the light tier. */
    lightBelow: number;
    /** Effort at or above this (0 to 1) takes the heavy tier. */
    heavyAbove: number;
    /** Below this confidence in the effort score, the request is never sent to the light tier. */
    minConfidence: number;
    /** Characters of the prompt sent to Jev, counted from the end, where the current message sits. */
    maxPromptChars: number;
};
/**
 * Resolved plugin settings. Config values win over environment variables, then defaults.
 * Top-level keys are shared; each feature has its own block with an `enabled` switch.
 */
export type JevGateSettings = {
    /** Overrides the agent's `identity.name` from the host config. Unset by default. */
    assistantName: string | undefined;
    assistantDescription: string;
    /** Messages kept per conversation. Every feature reads the same buffer. */
    bufferSize: number;
    replyGate: ReplyGateSettings;
    modelRouter: ModelRouterSettings;
    apiKey: string | undefined;
    /**
     * Set when `config.apiKey` is a SecretRef the host did not resolve (unknown provider, missing
     * store entry). The key then falls back to `TYPESAFE_API_KEY`. Holds only source/provider, never the value.
     */
    unresolvedApiKeyRef: {
        source: string;
        provider: string;
    } | undefined;
    /** Raw SecretRef object kept for lazy runtime resolution when the host did not pre-resolve it. Never logged. */
    apiKeyRef?: unknown;
    baseUrl: string;
    model: string;
    timeoutMs: number;
};
export declare const DEFAULT_SETTINGS: Omit<JevGateSettings, "apiKey">;
type Env = Record<string, string | undefined>;
export declare function resolveSettings(pluginConfig: Record<string, unknown> | undefined, env?: Env): JevGateSettings;
export {};
