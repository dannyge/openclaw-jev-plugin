/**
 * Minimal client for TypeSafe Jev's `POST /v1/systemone`.
 *
 * Mirrors the request and response shapes of `@typesafe-ai/sdk` 0.6.0 (see the
 * SDK's `types.d.ts`). The SDK itself is not a dependency: it was published two
 * days before this plugin and the repository's 7-day release cooldown refuses it.
 * Swapping this file for the SDK is a one-file change.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export type EntryType = string | {
    [key: string]: JsonValue;
} | JsonValue[] | null;
export type NoulQuestion = {
    type: "noul";
    instructions?: EntryType;
    criteria?: {
        true?: EntryType;
        false?: EntryType;
    } | null;
};
export type ChoiceQuestion<T extends Record<string, EntryType> = Record<string, EntryType>> = {
    type: "choice";
    instructions?: EntryType;
    criteria: T;
};
/** Ordered levels, low to high. 2 to 10 entries; each must describe a situation that stands on its own. */
export type ScoreQuestion = {
    type: "score";
    instructions?: EntryType;
    criteria: readonly EntryType[];
};
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export type Questions = Record<string, Question>;
export type NoulResponse = {
    type: "noul";
    noul: number;
};
export type ChoiceResponse<T extends Record<string, EntryType> = Record<string, EntryType>> = {
    type: "choice";
    choice: keyof T & string;
    confidence: number;
    probabilities: {
        [label in keyof T]: number;
    };
};
export type ScoreResponse = {
    type: "score";
    /** Probability-weighted level, from 0 to the highest level index. */
    score: number;
    confidence: number;
    /** Probability per level, keyed by the level index as a string. */
    probabilities: Record<string, number>;
};
export type ResultFor<Q extends Question> = Q extends NoulQuestion ? NoulResponse : Q extends ScoreQuestion ? ScoreResponse : Q extends ChoiceQuestion<infer T> ? ChoiceResponse<T> : never;
export type SystemOneResult<Q extends Questions> = {
    model: string;
    answers: {
        [K in keyof Q]: ResultFor<Q[K]>;
    };
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
};
export declare const noul: (instructions: EntryType, criteria?: NoulQuestion["criteria"]) => NoulQuestion;
export declare const choice: <const T extends Record<string, EntryType>>(instructions: EntryType, criteria: T) => ChoiceQuestion<T>;
export declare const score: (instructions: EntryType, criteria: readonly EntryType[]) => ScoreQuestion;
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
export type JevClientOptions = {
    apiKey: string;
    baseUrl?: string;
    model?: string;
    timeoutMs?: number;
    fetch?: Fetch;
};
export type JevClient = {
    systemOne<const Q extends Questions>(state: EntryType, questions: Q, options?: {
        signal?: AbortSignal;
    }): Promise<SystemOneResult<Q>>;
};
export declare class JevError extends Error {
    readonly status: number | undefined;
    readonly requestId: string | undefined;
    constructor(message: string, options?: {
        status?: number;
        requestId?: string;
        cause?: unknown;
    });
}
export declare function createJevClient(options: JevClientOptions): JevClient;
