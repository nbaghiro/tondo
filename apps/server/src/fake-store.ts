import { summarise } from "@tondo/db";
import type { AccountStore, Draft, PageStore, PageSummary } from "@tondo/db";
import { teamLookOf } from "@tondo/page";
import type { Page, Plan, Standing } from "@tondo/page";

const FREE = { plan: "free" as const, endsAt: null };

const personalStanding = (
    account: { plan: Plan; endsAt: Date | null },
    rank: number,
    personalLive: number,
    published: boolean,
): Standing => ({
    kind: "personal",
    account,
    team: null,
    rank,
    joinedOlder: false,
    personalLive,
    joinedLive: false,
    published,
});

/** Keeps addresses in memory, for tests. */
export function createFakeStore(): AccountStore & {
    suspend: (userId: string) => void;
    teamOwners: Set<string>;
    plans: Map<string, { plan: Plan; endsAt: Date | null }>;
    customers: Map<string, string>;
} {
    const customers = new Map<string, string>();
    const owners = new Map<string, string>();
    const plans = new Map<string, { plan: Plan; endsAt: Date | null }>();
    const suspended = new Set<string>();
    const teamOwners = new Set<string>();
    const handlesOf = (userId: string) =>
        [...owners].filter(([, owner]) => owner === userId).map(([handle]) => handle);
    const summary = (handle: string): PageSummary => ({
        id: handle,
        handle,
        name: handle,
        look: "madder",
        seed: null,
        photo: null,
        live: false,
        changed: true,
        updatedAt: "1",
        side: "own",
        standing: personalStanding(FREE, 0, 0, false),
    });
    const listPages = (userId: string) => Promise.resolve(handlesOf(userId).map(summary));
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
        listPages,
        listReachable: listPages,
        ownsTeam: (userId) => Promise.resolve(teamOwners.has(userId)),
        teamOwners,
        teamLine: () => Promise.resolve(null),
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
    const standingFor = (id: string, row: Row) => {
        const live = ofUser(row.userId).filter(([, other]) => other.published);
        const at = live.findIndex(([other]) => other === id);
        const older = at < 0 ? live.filter(([other]) => other < id).length : at;
        return personalStanding(row.plan ?? FREE, older, live.length, row.published !== null);
    };
    const toDraft = (id: string, row: Row): Draft => ({
        page: row.draft,
        handle: row.handle,
        updatedAt: String(row.updatedAt),
        published: row.published !== null,
        changed: isChanged(row),
        suspended: row.suspended === true,
        userId: row.userId,
        side: "own",
        standing: standingFor(id, row),
        team: null,
        liveLook: row.published ? teamLookOf(row.published) : null,
    });
    const listOf = (userId: string) =>
        Promise.resolve(
            ofUser(userId).map(([id, row]): PageSummary => ({
                id,
                handle: row.handle,
                name: row.draft.header.name,
                look: row.draft.look,
                seed: row.draft.seed ?? null,
                photo: row.draft.header.photo?.file ?? null,
                live: row.published !== null,
                changed: isChanged(row),
                updatedAt: String(row.updatedAt),
                side: "own",
                standing: standingFor(id, row),
            })),
        );
    const store: PageStore = {
        findLive: (handle) => {
            const row = [...rows].find(([, other]) => other.handle === handle);
            if (!row?.[1].published || row[1].suspended) return Promise.resolve(null);
            return Promise.resolve({
                id: row[0],
                page: row[1].published,
                standing: standingFor(row[0], row[1]),
                teamLook: null,
            });
        },
        listPublished: () => {
            return Promise.resolve(
                [...rows]
                    .filter(([, row]) => row.published && !row.suspended)
                    .map(([id, row]) => ({ handle: row.handle, standing: standingFor(id, row) })),
            );
        },
        listPages: (userId) => listOf(userId),
        listReachable: (userId) => listOf(userId),
        teamPageIds: () => Promise.resolve([]),
        documentsOfTeam: () => Promise.resolve([]),
        moveTeamPhotos: () => Promise.resolve(),
        documentsOfPage: (pageId) => {
            const row = rows.get(pageId);
            return Promise.resolve(
                row ? (row.published ? [row.draft, row.published] : [row.draft]) : [],
            );
        },
        replaceInPage: () => Promise.resolve(),
        handlesAround: (userId) => Promise.resolve(ofUser(userId).map(([, row]) => row.handle)),
        handlesAffected: (pageId) => {
            const row = rows.get(pageId);
            return Promise.resolve(row ? ofUser(row.userId).map(([, other]) => other.handle) : []);
        },
        findDraft: (userId, pageId) => {
            const row = own(userId, pageId);
            return Promise.resolve(row ? toDraft(pageId, row) : null);
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
        createPage: (userId, handle, page, given) => {
            if ([...rows.values()].some((row) => row.handle === handle)) {
                return Promise.resolve(null);
            }
            const id = given ?? crypto.randomUUID();
            const plan = ofUser(userId)[0]?.[1].plan;
            rows.set(id, {
                userId,
                handle,
                draft: page,
                published: null,
                updatedAt: 1,
                ...(plan ? { plan } : {}),
            });
            return Promise.resolve(id);
        },
        deletePage: (userId, pageId) => {
            if (!own(userId, pageId) || ofUser(userId).length < 2) return Promise.resolve(false);
            rows.delete(pageId);
            return Promise.resolve(true);
        },
        documentsOf: (userId) =>
            Promise.resolve(
                ofUser(userId).flatMap(([, row]) =>
                    row.published ? [row.draft, row.published] : [row.draft],
                ),
            ),
        movePhotos: (userId, from, to) => {
            const moved = (page: Page) =>
                JSON.parse(JSON.stringify(page).replaceAll(from, to)) as Page;
            for (const [, row] of ofUser(userId)) {
                row.draft = moved(row.draft);
                if (row.published) row.published = moved(row.published);
                row.updatedAt += 1;
            }
            return Promise.resolve();
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
