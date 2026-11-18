/**
 * Hook wiring. Each feature has an `enabled` switch in its own settings block.
 *
 * Reply gate: `before_dispatch` is a claim hook. Returning `{ handled: true }`
 * without text ends the message before the model runs, which is how the gate
 * keeps the bot silent. Returning nothing lets ordinary dispatch continue.
 *
 * Model router: `before_model_resolve` can override the provider and model for
 * one run. The host skips the hook when the model selection is locked and
 * catches anything the hook throws, so a routing failure never blocks a run.
 *
 * Both features read the same conversation buffer, which `before_dispatch` and
 * `message_sent` feed whether or not the gate is on.
 */
import type { OpenClawPluginApi, PluginHookBeforeDispatchContext, PluginHookBeforeDispatchEvent } from "openclaw/plugin-sdk/plugin-entry";
import { type ConversationBuffer } from "./buffer.js";
import { type JevGateSettings } from "./config.js";
import { type JevClient } from "./jev-client.js";
export type JevGateDependencies = {
    jev?: JevClient;
    settings?: JevGateSettings;
    now?: () => number;
};
export type JevGateHandle = {
    settings: JevGateSettings;
    buffer: ConversationBuffer;
};
export declare function conversationKey(event: PluginHookBeforeDispatchEvent, ctx: PluginHookBeforeDispatchContext): string;
export declare function registerJevGate(api: OpenClawPluginApi, deps?: JevGateDependencies): JevGateHandle;
