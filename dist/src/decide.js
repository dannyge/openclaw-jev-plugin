import { choice, noul } from "./jev-client.js";
export const QUESTIONS = {
    addressedToAssistant: noul("Is the latest message directed at the assistant, or a continuation of an exchange the assistant is already having with this person?", {
        true: "The person is talking to the assistant, asks it something, or follows up on the assistant's last reply.",
        false: "The person is talking to someone else, to the whole group without expecting the assistant, or to nobody in particular.",
    }),
    wantsAssistantReply: noul("Would the people in this chat expect the assistant to answer the latest message right now?", {
        true: "An answer from the assistant would be welcome and useful here.",
        false: "An answer from the assistant would be noise, an interruption, or unwanted.",
    }),
    audience: choice("Who is the latest message for?", {
        assistant: "The assistant.",
        another_person: "A specific other participant, not the assistant.",
        whole_group: "Everyone in the chat, with no one in particular expected to answer.",
        nobody: "Small talk, a reaction, an acknowledgement, or a message that asks for nothing.",
    }),
};
export function buildState(input) {
    const history = input.recent.slice(0, -1);
    const latest = input.recent[input.recent.length - 1];
    const toJson = (message) => ({
        from: message.role === "assistant" ? "assistant" : `participant:${message.sender}`,
        text: message.text,
        secondsAgo: Math.max(0, Math.round((input.now - message.timestamp) / 1000)),
        ...(message.role === "user" && message.assistantAction
            ? { assistantAction: message.assistantAction }
            : {}),
    });
    return {
        assistant: { name: input.assistantName, description: input.assistantDescription },
        conversation: {
            kind: input.isGroup ? "group chat with several people" : "direct message",
            ...(input.channel ? { channel: input.channel } : {}),
            recentMessages: history.map(toJson),
        },
        latestMessage: latest ? toJson(latest) : null,
        note: "assistantAction says what the assistant did after an earlier message: replied, stayed_silent, or mentioned (it was named directly).",
    };
}
export async function decideWithJev(jev, input, threshold, options) {
    const { answers } = await jev.systemOne(buildState(input), QUESTIONS, options);
    const addressed = clamp(answers.addressedToAssistant.noul);
    const wanted = clamp(answers.wantsAssistantReply.noul);
    const audience = answers.audience.choice;
    const probability = Math.max(addressed, wanted);
    const reply = probability >= threshold;
    const reason = `addressed=${addressed.toFixed(2)} wanted=${wanted.toFixed(2)} ` +
        `audience=${audience}(${clamp(answers.audience.confidence).toFixed(2)}) threshold=${threshold}`;
    return { reply, probability, audience, reason };
}
function clamp(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }
    return Math.min(1, Math.max(0, value));
}
