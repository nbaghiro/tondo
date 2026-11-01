import { pageSchema } from "@tondo/page";
import type { Page } from "@tondo/page";

// A copy of work the server doesn't have yet, so a lost connection or a closed tab loses nothing.
const key = (handle: string) => `tondo-unsaved-v1:${handle}`;

/** Unsaved work, if it was made on top of what the server has now. */
export function loadBackup(handle: string, updatedAt: string): Page | null {
    try {
        const saved = localStorage.getItem(key(handle));
        if (!saved) return null;
        const { page, base } = JSON.parse(saved) as { page: unknown; base: string };
        if (base !== updatedAt) return null;
        const parsed = pageSchema.safeParse(page);
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

export function saveBackup(handle: string, page: Page, base: string): void {
    try {
        localStorage.setItem(key(handle), JSON.stringify({ page, base }));
    } catch {
        // Browser storage is full or blocked. The server save still runs.
    }
}

export function clearBackup(handle: string): void {
    try {
        localStorage.removeItem(key(handle));
    } catch {
        // As above.
    }
}
