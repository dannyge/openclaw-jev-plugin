export const MAX_TEXT_LENGTH = 400;
const MAX_CONVERSATIONS = 500;
export function truncateText(text, max = MAX_TEXT_LENGTH) {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= max) {
        return collapsed;
    }
    return `${collapsed.slice(0, max - 1)}…`;
}
export function createConversationBuffer(options) {
    const size = Math.max(1, Math.floor(options.size));
    const maxConversations = Math.max(1, options.maxConversations ?? MAX_CONVERSATIONS);
    // Map preserves insertion order, so re-inserting on touch gives an LRU.
    const conversations = new Map();
    function touch(key) {
        const existing = conversations.get(key);
        if (existing) {
            conversations.delete(key);
            conversations.set(key, existing);
            return existing;
        }
        const created = [];
        conversations.set(key, created);
        while (conversations.size > maxConversations) {
            const oldest = conversations.keys().next().value;
            if (oldest === undefined) {
                break;
            }
            conversations.delete(oldest);
        }
        return created;
    }
    return {
        append(key, message) {
            const entries = touch(key);
            const stored = { ...message, text: truncateText(message.text) };
            entries.push(stored);
            while (entries.length > size) {
                entries.shift();
            }
            return stored;
        },
        recent(key) {
            return [...(conversations.get(key) ?? [])];
        },
        markLast(key, action) {
            const entries = conversations.get(key);
            const last = entries?.[entries.length - 1];
            if (last && last.role === "user") {
                last.assistantAction = action;
            }
        },
        conversationCount() {
            return conversations.size;
        },
    };
}
