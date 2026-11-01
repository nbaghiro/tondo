import { pageSchema } from "@tondo/page";
import type { Page } from "@tondo/page";

// A copy of work the server doesn't have yet, so a lost connection or a closed tab loses nothing.
// Each tab keeps its own, so a save in one tab can't clear another tab's unsaved work.
const PREFIX = "tondo-unsaved-v2:";

function tabId(): string {
    try {
        const known = sessionStorage.getItem("tondo-tab");
        if (known) return known;
        const made = crypto.randomUUID();
        sessionStorage.setItem("tondo-tab", made);
        return made;
    } catch {
        return "tab";
    }
}

const key = (handle: string, tab = tabId()) => `${PREFIX}${handle}:${tab}`;

export interface Backup {
    key: string;
    page: Page;
    base: string;
}

function allBackups(handle: string): Backup[] {
    const found: Backup[] = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const name = localStorage.key(i);
            if (!name?.startsWith(`${PREFIX}${handle}:`)) continue;
            const { page, base } = JSON.parse(localStorage.getItem(name) ?? "{}") as {
                page: unknown;
                base: string;
            };
            const parsed = pageSchema.safeParse(page);
            if (parsed.success) found.push({ key: name, page: parsed.data, base });
        }
    } catch {
        // Browser storage is blocked, so there's nothing to find.
    }
    return found;
}

/** Unsaved work from this tab or a closed one, if it was made on top of what the server has now. */
export function loadBackup(handle: string, updatedAt: string): Page | null {
    const usable = allBackups(handle).filter((backup) => backup.base === updatedAt);
    return (usable.find((backup) => backup.key === key(handle)) ?? usable[0])?.page ?? null;
}

/** Unsaved work made on an older version. It can't merge by itself, so the person chooses. */
export function loadStaleBackup(handle: string, updatedAt: string): Backup | null {
    return allBackups(handle).find((backup) => backup.base !== updatedAt) ?? null;
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

export function dropBackup(name: string): void {
    try {
        localStorage.removeItem(name);
    } catch {
        // As above.
    }
}

/** Saves a page as a file, so nothing is lost even if someone chooses the other version. */
export function downloadPage(page: Page, handle: string): void {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(page, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${handle}-tondo-page.json`;
    link.click();
    URL.revokeObjectURL(url);
}
