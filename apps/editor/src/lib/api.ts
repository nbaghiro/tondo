import { routes } from "@tondo/contract";
import type {
    DeleteAccountResponse,
    DraftResponse,
    ErrorResponse,
    HandleResponse,
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

/** Claims an address with the page the start flow built. Returns what went wrong, if anything. */
export async function claimAddress(handle: string, page: Page): Promise<string | null> {
    const res = await send("POST", routes.claim, { handle, page });
    if (res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as Partial<ErrorResponse>;
    return body.error ?? "That didn't work. Please try again.";
}

export async function loadDraft(): Promise<DraftResponse> {
    const res = await fetch(routes.draft);
    if (!res.ok) throw new Error("The page couldn't be loaded.");
    return (await res.json()) as DraftResponse;
}

export type SaveResult =
    | { state: "saved"; updatedAt: string }
    | { state: "conflict" | "refused" | "logged-out" | "failed"; message?: string };

export async function saveDraft(
    page: Page,
    updatedAt: string,
    previous: string | null,
): Promise<SaveResult> {
    try {
        const res = await send("PUT", routes.draft, {
            page,
            updatedAt,
            ...(previous ? { previous } : {}),
        });
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

export async function loadStats(days = 30): Promise<StatsResponse | null> {
    const res = await fetch(`${routes.stats}?days=${String(days)}`).catch(() => null);
    return res?.ok ? ((await res.json()) as StatsResponse) : null;
}

const postEmpty = (path: string) => send("POST", path, {});
const problemIn = async (res: Response) => {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    return body.error ?? body.message ?? "That didn't work. Please try again.";
};

/** Each of these returns what went wrong, or null if it worked. */
export async function unpublish(): Promise<string | null> {
    const res = await postEmpty(routes.unpublish).catch(() => null);
    return res?.ok ? null : "That didn't work. Check your connection and try again.";
}

export async function changeAddress(handle: string): Promise<string | null> {
    const res = await send("PATCH", routes.claim, { handle }).catch(() => null);
    if (!res) return "That didn't work. Check your connection and try again.";
    return res.ok ? null : problemIn(res);
}

export async function changePassword(
    currentPassword: string,
    newPassword: string,
): Promise<string | null> {
    const res = await send("POST", routes.changePassword, {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
    }).catch(() => null);
    if (!res) return "That didn't work. Check your connection and try again.";
    if (res.ok) return null;
    return res.status === 400 ? "That current password isn't right." : problemIn(res);
}

export async function deleteAccount(handle: string): Promise<DeleteAccountResponse | string> {
    const res = await send("DELETE", routes.me, { handle }).catch(() => null);
    if (!res) return "That didn't work. Check your connection and try again.";
    return res.ok ? ((await res.json()) as DeleteAccountResponse) : problemIn(res);
}

export async function checkAddress(handle: string): Promise<HandleResponse | null> {
    const res = await fetch(routes.handleCheck(handle)).catch(() => null);
    return res?.ok ? ((await res.json()) as HandleResponse) : null;
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
