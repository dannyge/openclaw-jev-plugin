/**
 * Mention detection. A mention always gets an answer, so this runs before Jev.
 *
 * Patterns are plain names (matched as whole words, case-insensitive, with or
 * without a leading `@`) or `/regex/flags` strings.
 */
export type MentionMatcher = {
    matches(text: string | undefined): boolean;
};
export declare function compileMentionPattern(pattern: string): RegExp | undefined;
export declare function createMentionMatcher(patterns: readonly string[]): MentionMatcher;
