import { pageSchema } from "@tondo/page";
import type { Page } from "@tondo/page";

const key = (handle: string) => `tondo-draft-v1:${handle}`;

export function loadDraft(handle: string): Page | null {
    try {
        const saved = localStorage.getItem(key(handle));
        if (!saved) return null;
        const parsed = pageSchema.safeParse(JSON.parse(saved));
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

export function saveDraft(handle: string, page: Page): boolean {
    try {
        localStorage.setItem(key(handle), JSON.stringify(page));
        return true;
    } catch {
        return false;
    }
}
