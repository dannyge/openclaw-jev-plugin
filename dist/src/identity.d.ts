/**
 * Resolves which agent a message belongs to, what that agent is called, and
 * whether a text mentions it. The host owns all three: the agent id is encoded
 * in the session key (`agent:<id>:...`), the name is `agents.list[].identity.name`,
 * and mention patterns follow the host's own precedence (agent `groupChat`,
 * then `messages.groupChat`, then patterns derived from the identity).
 *
 * Plugin config only adds to that: `assistantName` overrides the name and
 * `mentionPatterns` are extra patterns on top of the host's.
 */
import type { OpenClawConfig, OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { JevGateSettings } from "./config.js";
export declare const FALLBACK_ASSISTANT_NAME = "assistant";
export type AssistantScope = {
    channel?: string;
    conversationId?: string;
};
export type ResolvedAssistant = {
    agentId: string;
    name: string;
    mentions(text: string | undefined): boolean;
};
export type AssistantResolver = {
    resolve(sessionKey: string | undefined, scope?: AssistantScope): ResolvedAssistant;
};
export declare function agentIdFromSessionKey(sessionKey: string | undefined): string | undefined;
export declare function defaultAgentId(cfg: OpenClawConfig | undefined): string;
export declare function createAssistantResolver(api: Pick<OpenClawPluginApi, "config" | "runtime">, settings: Pick<JevGateSettings, "assistantName"> & {
    mentionPatterns: readonly string[];
}): AssistantResolver;
