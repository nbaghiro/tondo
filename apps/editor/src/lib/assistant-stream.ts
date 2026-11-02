import {
    assistantEvent,
    assistantImageResponse,
    assistantPhotoResponse,
    assistantStatus,
    routes,
} from "@tondo/contract";
import type {
    AssistantEvent,
    AssistantStatus,
    AssistantTurn,
    ErrorResponse,
} from "@tondo/contract";
import { withPhotoPage } from "./api";

const send = (path: string, body: object, signal?: AbortSignal) =>
    fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        ...(signal ? { signal } : {}),
    });

export async function loadAssistant(): Promise<AssistantStatus | null> {
    const res = await fetch(routes.assistant).catch(() => null);
    if (!res?.ok) return null;
    const parsed = assistantStatus.safeParse(await res.json().catch(() => null));
    return parsed.success ? parsed.data : null;
}

/** Runs one turn, passing on each event that checks out. Throws what to say if it can't start. */
export async function streamTurn(
    turn: AssistantTurn,
    signal: AbortSignal,
    onEvent: (event: AssistantEvent) => void,
): Promise<void> {
    const res = await send(withPhotoPage(routes.assistantTurn), turn, signal);
    if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as Partial<ErrorResponse>;
        throw new Error(body.error ?? "Help me isn't available right now.");
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let waiting = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        waiting += value;
        const chunks = waiting.split("\n\n");
        waiting = chunks.pop() ?? "";
        for (const chunk of chunks) {
            const data = chunk
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart())
                .join("\n");
            if (!data) continue;
            const event = assistantEvent.safeParse(JSON.parse(data));
            if (event.success) onEvent(event.data);
        }
    }
}

const problem = async (res: Response) => {
    const body = (await res.json().catch(() => ({}))) as Partial<ErrorResponse>;
    return body.error ?? "That didn't work. Please try again.";
};

export async function makeImages(body: {
    prompt: string;
    kind: "photo" | "logo" | "art";
    count: number;
    name: string;
}): Promise<{ files: string[]; creditsLeft: number } | { error: string }> {
    const res = await send(withPhotoPage(routes.assistantImage), body).catch(() => null);
    if (!res) return { error: "The connection dropped. Please try again." };
    if (!res.ok) return { error: await problem(res) };
    return assistantImageResponse.parse(await res.json());
}

export async function keepPhoto(url: string): Promise<{ file: string } | { error: string }> {
    const res = await send(withPhotoPage(routes.assistantPhoto), { url }).catch(() => null);
    if (!res) return { error: "The connection dropped. Please try again." };
    if (!res.ok) return { error: await problem(res) };
    return assistantPhotoResponse.parse(await res.json());
}

export function discardImages(files: string[]): void {
    if (!files.length) return;
    send(withPhotoPage(routes.assistantDiscard), { files }).catch(() => undefined);
}
