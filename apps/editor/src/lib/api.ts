import { routes } from "@tondo/contract";
import type {
    BillingResponse,
    CheckoutRequest,
    DeleteAccountResponse,
    DraftResponse,
    ErrorResponse,
    HandleResponse,
    IssuesResponse,
    LiveResponse,
    NewPageRequest,
    NewPageResponse,
    PagesResponse,
    PageSummary,
    PhotosResponse,
    PublishCheckResponse,
    SaveResponse,
    StatsResponse,
} from "@tondo/contract";
import { pageHash } from "@tondo/page";
import type { Page, PublishIssue } from "@tondo/page";
import { clearBackup, loadBackup } from "../state/storage";

// Which page new photos belong to. Left empty in the start flow, before the first page exists.
let photoPage = "";
export const setPhotoPage = (pageId: string): void => {
    photoPage = pageId;
};
/** Added to an address that stores a new photo. */
export const withPhotoPage = (path: string): string =>
    photoPage ? `${path}?page=${photoPage}` : path;

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

export async function loadDraft(pageId: string): Promise<DraftResponse> {
    const res = await fetch(routes.page(pageId));
    if (!res.ok) throw new Error("The page couldn't be loaded.");
    return (await res.json()) as DraftResponse;
}

export type SaveResult =
    | { state: "saved"; updatedAt: string }
    | { state: "conflict" | "refused" | "logged-out" | "failed"; message?: string };

export async function saveDraft(
    pageId: string,
    page: Page,
    updatedAt: string,
    previous: readonly string[] | null,
): Promise<SaveResult> {
    try {
        const res = await send("PUT", routes.page(pageId), {
            page,
            updatedAt,
            ...(previous?.length ? { previous } : {}),
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

export async function publish(pageId: string, updatedAt: string): Promise<PublishResult> {
    const failed = "Publishing didn't work. Check your connection and try again.";
    try {
        const res = await send("POST", routes.publish(pageId), { updatedAt });
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

/** What visitors see now, or null if nothing is live. */
export async function loadLive(pageId: string): Promise<Page | null> {
    const res = await fetch(routes.live(pageId)).catch(() => null);
    if (!res?.ok) return null;
    return ((await res.json()) as LiveResponse).page;
}

/** What only the server can check before publishing, such as a link it won't allow. */
export async function loadPublishChecks(pageId: string): Promise<PublishIssue[]> {
    const res = await fetch(routes.publishCheck(pageId)).catch(() => null);
    return res?.ok ? ((await res.json()) as PublishCheckResponse).issues : [];
}

export async function loadStats(pageId: string, days = 30): Promise<StatsResponse | null> {
    const res = await fetch(`${routes.stats(pageId)}?days=${String(days)}`).catch(() => null);
    return res?.ok ? ((await res.json()) as StatsResponse) : null;
}

const postEmpty = (path: string) => send("POST", path, {});
const problemIn = async (res: Response) => {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    return body.error ?? body.message ?? "That didn't work. Please try again.";
};

/** Each of these returns what went wrong, or null if it worked. */
export async function unpublish(pageId: string): Promise<string | null> {
    const res = await postEmpty(routes.unpublish(pageId)).catch(() => null);
    return res?.ok ? null : "That didn't work. Check your connection and try again.";
}

export async function changeAddress(pageId: string, handle: string): Promise<string | null> {
    const res = await send("PATCH", routes.pageHandle(pageId), { handle }).catch(() => null);
    if (!res) return "That didn't work. Check your connection and try again.";
    return res.ok ? null : problemIn(res);
}

export async function loadPages(): Promise<PageSummary[] | null> {
    const res = await fetch(routes.pages).catch(() => null);
    return res?.ok ? ((await res.json()) as PagesResponse).pages : null;
}

/** Adds a page, and returns its id or what went wrong. */
export async function createPage(
    request: NewPageRequest,
): Promise<{ id: string } | { error: string }> {
    const res = await send("POST", routes.pages, request).catch(() => null);
    if (!res) return { error: "That didn't work. Check your connection and try again." };
    return res.ok ? ((await res.json()) as NewPageResponse) : { error: await problemIn(res) };
}

export async function deletePage(pageId: string): Promise<string | null> {
    const res = await send("DELETE", routes.page(pageId), {}).catch(() => null);
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

export async function deleteAccount(email: string): Promise<DeleteAccountResponse | string> {
    const res = await send("DELETE", routes.me, { email }).catch(() => null);
    if (!res) return "That didn't work. Check your connection and try again.";
    return res.ok ? ((await res.json()) as DeleteAccountResponse) : problemIn(res);
}

/** Saves work the builder left in this browser, so what's shown here includes it. */
export async function savePendingWork(
    pageId: string,
    draft: DraftResponse,
): Promise<DraftResponse> {
    const waiting = loadBackup(pageId, draft.updatedAt);
    if (!waiting || pageHash(waiting) === pageHash(draft.page)) return draft;
    const saved = await saveDraft(pageId, waiting, draft.updatedAt, null);
    if (saved.state !== "saved") return draft;
    clearBackup(pageId);
    return loadDraft(pageId);
}

export async function checkAddress(handle: string): Promise<HandleResponse | null> {
    const res = await fetch(routes.handleCheck(handle)).catch(() => null);
    return res?.ok ? ((await res.json()) as HandleResponse) : null;
}

export async function loadPhotos(): Promise<string[]> {
    const res = await fetch(routes.photos).catch(() => null);
    return res?.ok ? ((await res.json()) as PhotosResponse).files : [];
}

/** Where to send someone to pay, or null if the payment page can't be opened. */
export async function startCheckout(request: CheckoutRequest): Promise<string | null> {
    const res = await send("POST", routes.billingCheckout, request).catch(() => null);
    return res?.ok ? ((await res.json()) as { url: string }).url : null;
}

/** Stripe's page for changing how many pages Pro has. */
export async function changePacks(packs: number): Promise<string | null> {
    const res = await send("POST", routes.billingPacks, { packs }).catch(() => null);
    return res?.ok ? ((await res.json()) as { url: string }).url : null;
}

export async function openPortal(): Promise<string | null> {
    const res = await send("POST", routes.billingPortal, {}).catch(() => null);
    return res?.ok ? ((await res.json()) as { url: string }).url : null;
}

export const syncBilling = async (): Promise<void> => {
    await send("POST", routes.billingSync, {}).catch(() => null);
};

export async function loadBilling(): Promise<BillingResponse | null> {
    const res = await fetch(routes.billing).catch(() => null);
    return res?.ok ? ((await res.json()) as BillingResponse) : null;
}

/** Returns what went wrong, or null if the photo's gone. */
export async function removePhoto(file: string): Promise<string | null> {
    const res = await send("DELETE", routes.photo(file), {}).catch(() => null);
    if (!res) return "That didn't work. Check your connection and try again.";
    return res.ok ? null : problemIn(res);
}

/** Returns the saved file's name, or a message saying why it was refused. */
export async function uploadPhoto(file: File): Promise<{ file: string } | { error: string }> {
    const body = new FormData();
    body.append("photo", file);
    try {
        const res = await fetch(withPhotoPage(routes.photos), { method: "POST", body });
        if (res.ok) return (await res.json()) as { file: string };
        const { error } = (await res.json()) as ErrorResponse;
        return { error };
    } catch {
        return { error: "That photo didn't upload. Check your connection and try again." };
    }
}
