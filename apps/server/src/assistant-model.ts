import type { ToolDeclaration } from "@tondo/page";

// Gemini over plain fetch, as Galleo's image calls are. One provider and a few fields don't need an
// SDK. The whole request is sent in one go rather than streamed, since a tool call only helps once
// it's complete. The key travels in a header, and never appears in a log, an error or a URL.

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const CALL_MS = 60_000;
const RETRIES = 2;
const MAX_WAIT_MS = 20_000;

export interface Part {
    text?: string;
    thought?: boolean;
    /** Gemini ties its reasoning to a call this way, so model turns go back exactly as they came. */
    thoughtSignature?: string;
    functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
    functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
}

export interface Content {
    role: "user" | "model";
    parts: Part[];
}

export interface ModelUsage {
    input: number;
    cached: number;
    output: number;
}

export interface ModelReply {
    parts: Part[];
    finish: string;
    blocked: boolean;
    usage: ModelUsage;
}

export interface ModelRequest {
    system: string;
    tools: readonly ToolDeclaration[];
    contents: readonly Content[];
    maxTokens: number;
    signal: AbortSignal;
    /** Asks for JSON of this shape, with no tools. */
    json?: object;
}

export interface Model {
    id: string;
    generate: (request: ModelRequest) => Promise<ModelReply>;
}

/** Thrown with the status alone, so nothing from a request can reach a log. */
export class ModelError extends Error {
    status: number;
    /** Google's name for the limit that was hit. Holds no content, so it's safe to log. */
    quota: string;
    constructor(status: number, quota = "") {
        super(`The model answered ${String(status)}${quota ? ` (${quota})` : ""}`);
        this.status = status;
        this.quota = quota;
    }
}

interface Price {
    input: number;
    cached: number;
    output: number;
    pricedOn: string;
    thinking?: string;
}

// US dollars per million tokens, Standard paid tier, from ai.google.dev/gemini-api/docs/pricing.
export const MODELS: Readonly<Record<string, Price>> = {
    "gemini-3.5-flash-lite": {
        input: 0.3,
        cached: 0.03,
        output: 2.5,
        pricedOn: "2026-11-01",
        thinking: "minimal",
    },
    "gemini-3.1-flash-lite": {
        input: 0.25,
        cached: 0.025,
        output: 1.5,
        pricedOn: "2026-11-01",
        thinking: "low",
    },
    // Promotional through 2026-12-31, and doubles after that.
    "gemini-3.6-flash": {
        input: 0.75,
        cached: 0.075,
        output: 3.75,
        pricedOn: "2026-11-01",
        thinking: "low",
    },
};

/** Per 1K image, from the same page. */
export const IMAGE_MODEL = {
    id: "gemini-3.1-flash-lite-image",
    usd: 0.0336,
    pricedOn: "2026-11-01",
};

export function costOf(modelId: string, usage: ModelUsage): number {
    const price = MODELS[modelId];
    if (!price) return 0;
    const fresh = Math.max(0, usage.input - usage.cached);
    return (
        (fresh * price.input + usage.cached * price.cached + usage.output * price.output) /
        1_000_000
    );
}

interface GeminiAnswer {
    candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: {
        promptTokenCount?: number;
        cachedContentTokenCount?: number;
        candidatesTokenCount?: number;
        thoughtsTokenCount?: number;
    };
}

const BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Stopped", "AbortError"));
        });
    });

async function send(
    url: string,
    key: string,
    body: object,
    signal: AbortSignal,
    fetchImpl: typeof fetch,
): Promise<Response> {
    for (let attempt = 0; ; attempt += 1) {
        const res = await fetchImpl(url, {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify(body),
            signal: AbortSignal.any([signal, AbortSignal.timeout(CALL_MS)]),
        });
        const again = res.status === 429 || res.status >= 500;
        if (!again || attempt >= RETRIES) return res;
        const asked = await res
            .clone()
            .json()
            .then(limitOf, () => ({ quota: "", seconds: 0 }));
        await wait(
            Math.min(MAX_WAIT_MS, Math.max(asked.seconds * 1000, 1000 * 3 ** attempt)),
            signal,
        );
    }
}

interface GoogleError {
    error?: {
        details?: {
            retryDelay?: string;
            violations?: { quotaId?: string }[];
        }[];
    };
}

/** Only these two fields are ever read from an error, since the rest could echo a request. */
function limitOf(body: unknown): { quota: string; seconds: number } {
    const details = (body as GoogleError).error?.details ?? [];
    const quota = details.flatMap((entry) => entry.violations ?? [])[0]?.quotaId ?? "";
    const delay = details.find((entry) => entry.retryDelay)?.retryDelay ?? "";
    return { quota, seconds: Number.parseFloat(delay) || 0 };
}

const failure = async (res: Response): Promise<ModelError> => {
    const { quota } = await res.json().then(limitOf, () => ({ quota: "" }));
    return new ModelError(res.status, quota);
};

export function createGemini(key: string, modelId: string, fetchImpl: typeof fetch = fetch): Model {
    const thinking = MODELS[modelId]?.thinking;
    return {
        id: modelId,
        generate: async ({ system, tools, contents, maxTokens, signal, json }) => {
            const res = await send(
                `${API}/${modelId}:generateContent`,
                key,
                {
                    systemInstruction: { parts: [{ text: system }] },
                    contents,
                    ...(tools.length
                        ? {
                              tools: [{ functionDeclarations: tools }],
                              toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                          }
                        : {}),
                    generationConfig: {
                        maxOutputTokens: maxTokens,
                        ...(thinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
                        ...(json
                            ? {
                                  responseMimeType: "application/json",
                                  responseJsonSchema: json,
                              }
                            : {}),
                    },
                },
                signal,
                fetchImpl,
            );
            if (!res.ok) throw await failure(res);
            const answer = (await res.json()) as GeminiAnswer;
            const candidate = answer.candidates?.[0];
            const finish = candidate?.finishReason ?? "";
            const usage = answer.usageMetadata;
            return {
                parts: candidate?.content?.parts ?? [],
                finish,
                blocked: Boolean(answer.promptFeedback?.blockReason) || BLOCKED.has(finish),
                usage: {
                    input: usage?.promptTokenCount ?? 0,
                    cached: usage?.cachedContentTokenCount ?? 0,
                    output: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
                },
            };
        },
    };
}

/** One image, as raw bytes. Refusals and empty answers are null. */
export async function generateImage(
    key: string,
    prompt: string,
    signal: AbortSignal,
    fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array | null> {
    const res = await send(
        `${API}/${IMAGE_MODEL.id}:generateContent`,
        key,
        {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                imageConfig: { aspectRatio: "1:1" },
            },
        },
        signal,
        fetchImpl,
    );
    if (!res.ok) throw await failure(res);
    const answer = (await res.json()) as {
        candidates?: {
            content?: { parts?: { inlineData?: { data?: string } }[] };
        }[];
    };
    const data = answer.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)
        ?.inlineData?.data;
    return data ? new Uint8Array(Buffer.from(data, "base64")) : null;
}
