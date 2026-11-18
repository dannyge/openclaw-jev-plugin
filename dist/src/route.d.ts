/**
 * Builds the Jev state and questions for one agent run and turns the answers
 * into a model tier. Jev supplies two independent judgments; the mapping from
 * those to a tier is plain code, so thresholds change without touching the
 * questions.
 */
import type { BufferedMessage } from "./buffer.js";
import type { ModelRouterSettings, ModelTiers } from "./config.js";
import { type EntryType, type JevClient } from "./jev-client.js";
export type Tier = keyof ModelTiers;
export type RouteInput = {
    assistantName: string;
    assistantDescription: string;
    channel: string | undefined;
    /** The prepared prompt for this run. The current message sits at the end. */
    prompt: string;
    attachmentKinds: readonly string[];
    /** Earlier messages in this conversation, oldest first. May be empty. */
    recent: readonly BufferedMessage[];
    now: number;
};
export type RouteDecision = {
    tier: Tier;
    /** Effort normalized to [0, 1]. */
    effort: number;
    reason: string;
};
export type ModelOverride = {
    providerOverride?: string;
    modelOverride?: string;
};
export declare const ROUTE_QUESTIONS: {
    readonly effort: import("./jev-client.js").ScoreQuestion;
    readonly highStakes: import("./jev-client.js").NoulQuestion;
};
/** Keeps the end of the prompt: the host puts the current message last, after any history. */
export declare function tailOf(text: string, max: number): string;
export declare function buildRouteState(input: RouteInput, maxPromptChars: number): EntryType;
/**
 * Heavy on high effort, or on high stakes with anything past a trivial request.
 * Light only when effort is low, stakes are low, Jev is sure, and there is
 * nothing attached. Everything else, including every uncertain case, is standard.
 */
export declare function pickTier(answers: {
    effort: number;
    confidence: number;
    highStakes: number;
    hasAttachments: boolean;
}, settings: Pick<ModelRouterSettings, "lightBelow" | "heavyAbove" | "minConfidence">): Tier;
export declare function routeWithJev(jev: JevClient, input: RouteInput, settings: ModelRouterSettings, options?: {
    signal?: AbortSignal;
}): Promise<RouteDecision>;
/** Splits `provider/model` on the first slash. A bare id overrides the model only. */
export declare function toModelOverride(ref: string | undefined): ModelOverride | undefined;
