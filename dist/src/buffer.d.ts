/**
 * Per-conversation ring buffer of the last few messages.
 *
 * The buffer is the only memory the gate has. Messages the gate silences never
 * reach the agent session, so they must be kept here or the next Jev call would
 * not see them.
 */
export type BufferedRole = "user" | "assistant";
export type AssistantAction = "replied" | "stayed_silent" | "mentioned";
export type BufferedMessage = {
    role: BufferedRole;
    sender: string;
    text: string;
    timestamp: number;
    /** What the gate decided for a user message, filled in after the decision. */
    assistantAction?: AssistantAction;
};
export type ConversationBuffer = {
    append(key: string, message: BufferedMessage): BufferedMessage;
    recent(key: string): BufferedMessage[];
    markLast(key: string, action: AssistantAction): void;
    conversationCount(): number;
};
export declare const MAX_TEXT_LENGTH = 400;
export declare function truncateText(text: string, max?: number): string;
export declare function createConversationBuffer(options: {
    size: number;
    maxConversations?: number;
}): ConversationBuffer;
