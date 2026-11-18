const REGEX_LITERAL = /^\/(.+)\/([a-z]*)$/s;
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function compileMentionPattern(pattern) {
    const trimmed = pattern.trim();
    if (!trimmed) {
        return undefined;
    }
    const literal = REGEX_LITERAL.exec(trimmed);
    if (literal) {
        try {
            const flags = literal[2].includes("i") ? literal[2] : `${literal[2]}i`;
            return new RegExp(literal[1], flags);
        }
        catch {
            return undefined;
        }
    }
    const name = escapeRegex(trimmed.replace(/^@/, ""));
    // `@name`, `name:` and bare `name` as a whole word.
    return new RegExp(`(^|[^\\p{L}\\p{N}_])@?${name}(?![\\p{L}\\p{N}_])`, "iu");
}
export function createMentionMatcher(patterns) {
    const compiled = patterns
        .map(compileMentionPattern)
        .filter((re) => re !== undefined);
    return {
        matches(text) {
            if (!text) {
                return false;
            }
            return compiled.some((re) => {
                re.lastIndex = 0;
                return re.test(text);
            });
        },
    };
}
