/**
 * Builds the Jev state and questions for one incoming message and turns the
 * answers into a reply decision.
 */
import type { BufferedMessage } from "./buffer.js";
import { type EntryType, type JevClient } from "./jev-client.js";
export type DecisionInput = {
    assistantName: string;
    assistantDescription: string;
    channel: string | undefined;
    isGroup: boolean;
    /** Recent messages, oldest first. The last one is the message under evaluation. */
    recent: readonly BufferedMessage[];
    now: number;
};
export type Decision = {
    reply: boolean;
    /** Probability that an answer is wanted, in [0, 1]. */
    probability: number;
    audience: string;
    reason: string;
};
export declare const QUESTIONS: {
    readonly addressedToAssistant: import("./jev-client.js").NoulQuestion;
    readonly wantsAssistantReply: import("./jev-client.js").NoulQuestion;
    readonly audience: import("./jev-client.js").ChoiceQuestion<{
        readonly assistant: "The assistant.";
        readonly another_person: "A specific other participant, not the assistant.";
        readonly whole_group: "Everyone in the chat, with no one in particular expected to answer.";
        readonly nobody: "Small talk, a reaction, an acknowledgement, or a message that asks for nothing.";
    }>;
};
export declare function buildState(input: DecisionInput): EntryType;
export declare function decideWithJev(jev: JevClient, input: DecisionInput, threshold: number, options?: {
    signal?: AbortSignal;
}): Promise<Decision>;
