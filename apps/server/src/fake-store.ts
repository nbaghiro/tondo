import { summarise } from "@tondo/db";
import type { AccountStore, Draft, PageStore, PageSummary } from "@tondo/db";
import type { Page, Plan } from "@tondo/page";

/** Keeps addresses in memory, for tests. */
export function createFakeStore(): AccountStore & {
    suspend: (userId: string) => void;
    plans: Map<string, { plan: Plan; endsAt: Date | null }>;
    customers: Map<string, string>;
} {
    const customers = new Map<string, string>();
    const owners = new Map<string, string>();
    const plans = new Map<string, { plan: Plan; endsAt: Date | null }>();
    const suspended = new Set<string>();
    const handlesOf = (userId: string) =>
        [...owners].filter(([, owner]) => owner === userId).map(([handle]) => handle);
    const summary = (handle: string): PageSummary => ({
        id: handle,
        handle,
        name: handle,
        look: "madder",
        seed: null,
        live: false,
        changed: true,
        updatedAt: "1",
    });
    return {
        plans,
        customers,
        findStripeId: (userId) => Promise.resolve(customers.get(userId) ?? null),
        setStripeId: (userId, stripeId) => {
            if (!customers.has(userId)) customers.set(userId, stripeId);
            return Promise.resolve(customers.get(userId) ?? null);
        },
        setPlan: (stripeId, { plan, endsAt, ifEmpty }) => {
            const userId = [...customers].find(([, id]) => id === stripeId)?.[0];
            if (!userId) return Promise.resolve(null);
            const before = plans.get(userId)?.endsAt ?? null;
            plans.set(userId, { plan, endsAt: ifEmpty ? (before ?? endsAt) : endsAt });
            return Promise.resolve(userId);
        },
        findPlan: (userId) => Promise.resolve(plans.get(userId) ?? { plan: "free", endsAt: null }),
        listPages: (userId) => Promise.resolve(handlesOf(userId).map(summary)),
        handleTaken: (handle) => Promise.resolve(owners.has(handle)),
        claimHandle: (userId, handle) => {
            const held = handlesOf(userId);
            if (held.length) return Promise.resolve(held.includes(handle));
            if (owners.has(handle)) return Promise.resolve(false);
            owners.set(handle, userId);
            return Promise.resolve(true);
        },
        suspend: (userId) => {
            suspended.add(userId);
        },
        removeUser: (userId) => {
            for (const handle of handlesOf(userId)) {
                if (suspended.has(userId)) owners.set(handle, `removed:${userId}`);
                else owners.delete(handle);
            }
            return Promise.resolve();
        },
    };
}

interface Row {
    userId: string;
    handle: string;
    draft: Page;
    published: Page | null;
    updatedAt: number;
    suspended?: boolean;
    plan?: { plan: Plan; endsAt: Date | null };
}

const FREE = { plan: "free" as const, endsAt: null };

/** Keeps pages in memory, for tests. `addUser` gives a person's first page their own id. */
export function createFakePages(seed: Readonly<Record<string, Page>> = {}) {
    const rows = new Map<string, Row>(
        Object.entries(seed).map(([handle, page]) => [
            `seed-${handle}`,
            { userId: `seed-${handle}`, handle, draft: page, published: page, updatedAt: 1 },
        ]),
    );
    const counts: { pageId: string; target: string }[] = [];
    const own = (userId: string, pageId: string) => {
        const row = rows.get(pageId);
        return row?.userId === userId ? row : undefined;
    };
    const ofUser = (userId: string) => [...rows].filter(([, row]) => row.userId === userId);
    const isChanged = (row: Row) => JSON.stringify(row.draft) !== JSON.stringify(row.published);
    const toDraft = (row: Row): Draft => ({
        page: row.draft,
        handle: row.handle,
        updatedAt: String(row.updatedAt),
        published: row.published !== null,
        changed: isChanged(row),
        suspended: row.suspended === true,
    });
    const store: PageStore = {
        findLive: (handle) => {
            const row = [...rows].find(([, other]) => other.handle === handle);
            if (!row?.[1].published || row[1].suspended) return Promise.resolve(null);
            const rank = ofUser(row[1].userId)
                .filter(([, other]) => other.published)
                .findIndex(([id]) => id === row[0]);
            return Promise.resolve({
                id: row[0],
                page: row[1].published,
                ...(row[1].plan ?? FREE),
                rank,
            });
        },
        listPages: (userId) =>
            Promise.resolve(
                ofUser(userId).map(([id, row]) => ({
                    id,
                    handle: row.handle,
                    name: row.draft.header.name,
                    look: row.draft.look,
                    seed: row.draft.seed ?? null,
                    live: row.published !== null,
                    changed: isChanged(row),
                    updatedAt: String(row.updatedAt),
                })),
            ),
        findDraft: (userId, pageId) => {
            const row = own(userId, pageId);
            return Promise.resolve(row ? toDraft(row) : null);
        },
        saveDraft: (userId, pageId, page, updatedAt) => {
            const row = own(userId, pageId);
            if (row?.updatedAt !== Number(updatedAt)) return Promise.resolve(null);
            row.draft = page;
            row.updatedAt += 1;
            return Promise.resolve(String(row.updatedAt));
        },
        publish: (userId, pageId, updatedAt) => {
            const row = own(userId, pageId);
            if (row?.updatedAt !== Number(updatedAt)) return Promise.resolve(false);
            row.published = row.draft;
            return Promise.resolve(true);
        },
        count: (pageId, target) => {
            counts.push({ pageId, target });
            return Promise.resolve();
        },
        unpublish: (userId, pageId) => {
            const row = own(userId, pageId);
            if (row) row.published = null;
            return Promise.resolve();
        },
        findOwnLive: (userId, pageId) => Promise.resolve(own(userId, pageId)?.published ?? null),
        statsFor: (userId, pageId, days) => {
            const today = new Date().toISOString().slice(0, 10);
            return Promise.resolve(
                summarise(
                    own(userId, pageId)
                        ? counts
                              .filter((c) => c.pageId === pageId)
                              .map(({ target }) => ({ target, day: today, count: 1 }))
                        : [],
                    days,
                ),
            );
        },
        createPage: (userId, handle, page) => {
            if ([...rows.values()].some((row) => row.handle === handle)) {
                return Promise.resolve(null);
            }
            const id = crypto.randomUUID();
            rows.set(id, { userId, handle, draft: page, published: null, updatedAt: 1 });
            return Promise.resolve(id);
        },
        deletePage: (userId, pageId) => {
            if (!own(userId, pageId) || ofUser(userId).length < 2) return Promise.resolve(false);
            rows.delete(pageId);
            return Promise.resolve(true);
        },
        setHandle: (userId, pageId, handle) => {
            const taken = [...rows].some(([id, row]) => row.handle === handle && id !== pageId);
            if (taken) return Promise.resolve(false);
            const row = own(userId, pageId);
            if (row) row.handle = handle;
            return Promise.resolve(true);
        },
    };
    const addUser = (userId: string, handle: string, page: Page) => {
        rows.set(userId, { userId, handle, draft: page, published: null, updatedAt: 1 });
    };
    const eachOf = (userId: string, change: (row: Row) => void) => {
        for (const [, row] of ofUser(userId)) change(row);
    };
    const suspend = (userId: string) => {
        eachOf(userId, (row) => {
            row.suspended = true;
        });
    };
    const setPlan = (userId: string, plan: { plan: Plan; endsAt: Date | null }) => {
        eachOf(userId, (row) => {
            row.plan = plan;
        });
    };
    const setDraft = (userId: string, page: Page) => {
        const row = rows.get(userId);
        if (row) row.draft = page;
    };
    return { store, counts, addUser, suspend, setDraft, setPlan };
}
