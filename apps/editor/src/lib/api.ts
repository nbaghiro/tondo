import { routes } from "@tondo/contract";
import type {
    DraftResponse,
    ErrorResponse,
    IssuesResponse,
    PhotosResponse,
    SaveResponse,
    StatsResponse,
} from "@tondo/contract";
import type { Page, PublishIssue } from "@tondo/page";

const send = (method: string, path: string, body: object) =>
    fetch(path, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

export async function loadDraft(): Promise<DraftResponse> {
    const res = await fetch(routes.draft);
    if (!res.ok) throw new Error("The page couldn't be loaded.");
    return (await res.json()) as DraftResponse;
}

export type SaveResult =
    | { state: "saved"; updatedAt: string }
    | { state: "conflict" | "refused" | "logged-out" | "failed"; message?: string };

export async function saveDraft(page: Page, updatedAt: string): Promise<SaveResult> {
    try {
        const res = await send("PUT", routes.draft, { page, updatedAt });
        if (res.ok) {
            const saved = (await res.json()) as SaveResponse;
            return { state: "saved", updatedAt: saved.updatedAt };
        }
        if (res.status === 409) return { state: "conflict" };
        if (res.status === 401) return { state: "logged-out" };
        if (res.status < 500) {
            const { error } = (await res.json()) as ErrorResponse;
            return { state: "refused", message: error };
        }
        return { state: "failed" };
    } catch {
        return { state: "failed" };
    }
}

export type PublishResult =
    | { state: "published" }
    | { state: "issues"; issues: PublishIssue[] }
    | { state: "failed"; message: string };

export async function publish(updatedAt: string): Promise<PublishResult> {
    const failed = "Publishing didn't work. Check your connection and try again.";
    try {
        const res = await send("POST", routes.publish, { updatedAt });
        if (res.ok) return { state: "published" };
        if (res.status === 422) {
            const { issues } = (await res.json()) as IssuesResponse;
            return { state: "issues", issues };
        }
        if (res.status < 500) {
            const { error } = (await res.json()) as ErrorResponse;
            return { state: "failed", message: error };
        }
        return { state: "failed", message: failed };
    } catch {
        return { state: "failed", message: failed };
    }
}

export async function loadStats(): Promise<StatsResponse | null> {
    const res = await fetch(routes.stats).catch(() => null);
    return res?.ok ? ((await res.json()) as StatsResponse) : null;
}

export async function loadPhotos(): Promise<string[]> {
    const res = await fetch(routes.photos).catch(() => null);
    return res?.ok ? ((await res.json()) as PhotosResponse).files : [];
}

/** Returns the saved file's name, or a message saying why it was refused. */
export async function uploadPhoto(file: File): Promise<{ file: string } | { error: string }> {
    const body = new FormData();
    body.append("photo", file);
    try {
        const res = await fetch(routes.photos, { method: "POST", body });
        if (res.ok) return (await res.json()) as { file: string };
        const { error } = (await res.json()) as ErrorResponse;
        return { error };
    } catch {
        return { error: "That photo didn't upload. Check your connection and try again." };
    }
}
