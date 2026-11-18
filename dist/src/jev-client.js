export const noul = (instructions, criteria) => ({
    type: "noul",
    instructions,
    ...(criteria ? { criteria } : {}),
});
export const choice = (instructions, criteria) => ({ type: "choice", instructions, criteria });
export const score = (instructions, criteria) => ({
    type: "score",
    instructions,
    criteria,
});
export class JevError extends Error {
    status;
    requestId;
    constructor(message, options) {
        super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
        this.name = "JevError";
        this.status = options?.status;
        this.requestId = options?.requestId;
    }
}
function joinSignals(a, b) {
    if (!a) {
        return b;
    }
    if (!b) {
        return a;
    }
    return AbortSignal.any([a, b]);
}
export function createJevClient(options) {
    const baseUrl = (options.baseUrl ?? "https://api.typesafe.ai").replace(/\/+$/, "");
    const model = options.model ?? "jev-latest";
    const timeoutMs = options.timeoutMs ?? 2500;
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
        throw new JevError("No fetch implementation available");
    }
    return {
        async systemOne(state, questions, callOptions) {
            if (Object.keys(questions).length === 0) {
                throw new JevError("systemOne needs at least one question");
            }
            const signal = joinSignals(AbortSignal.timeout(timeoutMs), callOptions?.signal);
            let response;
            try {
                response = await fetchImpl(`${baseUrl}/v1/systemone`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${options.apiKey}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "User-Agent": "openclaw-jev-gate/0.1.0",
                    },
                    body: JSON.stringify({ state, questions, model }),
                    signal,
                });
            }
            catch (error) {
                throw new JevError(`Jev request failed: ${describe(error)}`, { cause: error });
            }
            const requestId = response.headers.get("x-typesafe-request-id") ?? undefined;
            const text = await response.text();
            let parsed;
            try {
                parsed = text ? JSON.parse(text) : undefined;
            }
            catch {
                parsed = text;
            }
            if (!response.ok) {
                throw new JevError(`Jev responded ${response.status}: ${summarize(parsed)}`, {
                    status: response.status,
                    requestId,
                });
            }
            if (!parsed || typeof parsed !== "object" || !("answers" in parsed)) {
                throw new JevError("Jev response has no answers", { status: response.status, requestId });
            }
            return parsed;
        },
    };
}
function describe(error) {
    if (error instanceof Error) {
        return error.name === "TimeoutError" ? "timeout" : error.message;
    }
    return String(error);
}
function summarize(body) {
    if (typeof body === "string") {
        return body.slice(0, 200);
    }
    try {
        return JSON.stringify(body).slice(0, 200);
    }
    catch {
        return "unreadable body";
    }
}
