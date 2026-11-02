# Teams implementation plan

This plan builds option E in [teams-schema.md](teams-schema.md), ready to start on "go". Nothing here is built: no app code, migration, Neon setting or Stripe object has changed. I checked it against the working tree on 2026-11-01 while other agents were changing `apps/`, `packages/` and `.docs/`, so recheck line-level details when a milestone starts. All sizes are my estimates for one developer. Migrations and SQL here haven't been run.

**Changed on 2026-11-01:** there's no separate per-person Team plan any more. Team features are part of the flat Pro plan, $10 a month or $100 a year for the account, so everything here about per-seat pricing no longer applies: `team_month`, `TEAM_MINIMUM`, `for: "team"` on checkout, `syncSeats` and quantity changes. The T-milestone billing work becomes checking that the team's owner is on Pro. Recorded, not built: a limit of 10 people on a team, and those people sharing the owner's 300 credits. Members bill nothing themselves. `team` is gone from `limits.ts`, the Stripe code and pricing copy, and page and photo numbers elsewhere in this plan need rechecking against [plans-implementation.md](plans-implementation.md) when this starts.

## What's being built

A team has one owner, one address and one team page. Each person keeps their own address and pages. When the owner publishes the team page, its look appears on every member's live page, with nothing copied into their documents.

| Decided | How it works |
|---|---|
| Tables | One new table, `teams`. `users` gains `team_id`, and `pages` can belong to a person or a team |
| Membership | `users.team_id`, so one team per person. The owner is a member too |
| Roles | No column. The owner is `teams.owner_id`, and everyone else is a member |
| Invitations | Signed links that expire, with no table |
| Shared look | The team's main page's look, merged when read |
| Seats | A count of `users` with that `team_id` |
| Leaving | The person keeps their address and pages, and their own look returns |

### What this version doesn't do

These follow from the decisions, and `/teams` promises some of them today. They need new copy, listed under [Pricing and `/teams` copy](#pricing-and-teams-copy).

- **No Editor role.** Only the owner edits the team page. Nobody can edit another person's page.
- **No pages made for someone who hasn't joined.** A `users` row needs a Neon id, so each person signs up and makes their own page.
- **No duplicating a page, or choosing "links only" for members.**
- **Everyone needs an address, including the owner.** Their own page can stay unpublished, so an office manager can run a team without a public page, but they still hold an address.
- **A squad or a room with no person behind it needs its own sign-up.** The Clubs example on `/teams` is the case this affects most.

## Data

### Drizzle diff

`packages/db/src/schema.ts`:

```diff
+import { sql } from "drizzle-orm";
+import type { AnyPgColumn } from "drizzle-orm/pg-core";
 import {
+    check,
     date,
+    index,
     integer,
     ...
 } from "drizzle-orm/pg-core";

-export const users = pgTable("users", {
-    id: text("id").primaryKey(),
-    handle: text("handle").notNull().unique(),
-    /** Set when a page is taken down for abuse. It stops being served, and the account stays. */
-    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
-});
+export const users = pgTable(
+    "users",
+    {
+        id: text("id").primaryKey(),
+        handle: text("handle").notNull().unique(),
+        /** Set when a page is taken down for abuse. It stops being served, and the account stays. */
+        suspendedAt: timestamp("suspended_at", { withTimezone: true }),
+        teamId: uuid("team_id").references((): AnyPgColumn => teams.id, { onDelete: "set null" }),
+    },
+    (table) => [index("users_team").on(table.teamId)],
+);
+
+// An address that isn't a person's. No handle may be in both this table and `users`, which
+// handles.ts checks under a lock. An owner has to hand over or delete the team before leaving.
+export const teams = pgTable("teams", {
+    id: uuid("id").primaryKey().defaultRandom(),
+    handle: text("handle").notNull().unique(),
+    ownerId: text("owner_id")
+        .notNull()
+        .unique()
+        .references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
+});

 export const pages = pgTable(
     "pages",
     {
         id: uuid("id").primaryKey().defaultRandom(),
-        userId: text("user_id")
-            .notNull()
-            .references(() => users.id, { onDelete: "cascade" }),
+        userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
+        teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
         ...
     },
-    (table) => [unique("pages_user_slug").on(table.userId, table.slug)],
+    (table) => [
+        unique("pages_user_slug").on(table.userId, table.slug),
+        unique("pages_team_slug").on(table.teamId, table.slug),
+        check("pages_one_owner", sql`num_nonnulls(${table.userId}, ${table.teamId}) = 1`),
+    ],
 );
```

`unique` treats nulls as distinct, so the two slug constraints don't interfere and no partial index is needed. `owner_id` being unique means a person owns at most one team, and it also indexes the foreign key.

### Migration

Generate it with `pnpm db:generate`, and don't choose a number by hand. `plans-implementation.md` calls its migration `0003`, but `0003_eminent_tyrannus` is already the `usage` table, so its M1 will be `0004` or later. The generated file should be equivalent to this, with the foreign keys added after both tables exist:

```sql
CREATE TABLE "teams" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "handle" text NOT NULL,
    "owner_id" text NOT NULL,
    CONSTRAINT "teams_handle_unique" UNIQUE("handle"),
    CONSTRAINT "teams_owner_id_unique" UNIQUE("owner_id")
);
ALTER TABLE "users" ADD COLUMN "team_id" uuid;
ALTER TABLE "pages" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "pages" ADD COLUMN "team_id" uuid;
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE restrict;
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_teams_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE set null;
ALTER TABLE "pages" ADD CONSTRAINT "pages_team_id_teams_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE cascade;
CREATE INDEX "users_team" ON "users" ("team_id");
ALTER TABLE "pages" ADD CONSTRAINT "pages_team_slug" UNIQUE("team_id","slug");
ALTER TABLE "pages" ADD CONSTRAINT "pages_one_owner"
    CHECK (num_nonnulls("user_id", "team_id") = 1);
```

No existing row changes, and every existing page passes the check. It can ship before anything uses it. `tests/setup-database.ts` runs migrations, so it needs no change. Check that the generated SQL handles the circular foreign key, since I haven't run `drizzle-kit` on it.

### The billing migration

The owner's shape also has `teams.plan` and `teams.stripe_id`. Nothing reads them until T7, and the rule is no column until it's used, so I'd add them there:

```sql
ALTER TABLE teams ADD COLUMN plan text NOT NULL DEFAULT 'free';
ALTER TABLE teams ADD COLUMN stripe_id text UNIQUE;
ALTER TABLE teams ADD COLUMN ends_at timestamptz;
```

**`ends_at` isn't in the owner's shape.** The 30-day step-down in `plans-implementation.md` is worked out from when a plan ended, and that has to be stored locally, for the same reason as `users.ends_at`. Without it a team can't follow the downgrade rule. It's the first open decision.

### What's derived

| Value | How |
|---|---|
| Who owns a team | `teams.owner_id` |
| Whether someone is a member | `users.team_id` |
| Seats | `count(*) from users where team_id = ?`. The owner's row counts, and `removed:` tombstones never have a team |
| The team's name | `header.name` on the team's main page |
| The shared look | `look`, `paint` and `style` on that page's `published` |
| Whether a team page is taken down | The owner's `suspended_at` |
| A person's name on the Team page | `header.name` on their page, or else their address |
| The team's photo folder | `folderFor(team.id)` |
| Team totals | `stats` summed over the team's pages and its members' pages |

**Emails aren't shown on the Team page.** They live in Neon Auth, and a session only gives the signed-in person's own. Reading `neon_auth` directly is possible but untested, and the people list works without it.

**The owner must stay a member.** The database can't express "the owner's `team_id` is this team", so `createTeam` and `takeOver` set both in one transaction, and the leave and remove routes refuse the owner. A test covers it.

## Addresses across two tables

`users.handle` and `teams.handle` are each unique, and no constraint spans both, so every write takes a lock first.

**New file `packages/db/src/handles.ts`:**

```ts
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const handleTakenIn = async (db: Db | Tx, handle: string): Promise<boolean> => {
    const [row] = await db.execute<{ taken: boolean }>(sql`
        select exists (select 1 from users where handle = ${handle})
            or exists (select 1 from teams where handle = ${handle}) as taken`);
    return row?.taken ?? true;
};

/** Holds this address until the transaction ends, so a check and its write can't be split. */
export async function lockHandle(tx: Tx, handle: string): Promise<boolean> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${handle}, 0))`);
    return !(await handleTakenIn(tx, handle));
}
```

- **Why an advisory lock.** It's held per address, it needs no row to exist, and it ends with the transaction, so it also works if Neon's pooled connection is used. A hash collision only makes two unrelated claims wait for each other.
- **No deadlock.** Each transaction only ever locks one address, the new one. The old address needs no lock, because freeing it can't create a clash.
- **Unique constraints stay.** Within a table they're still the final guard.

| Write | File | Change |
|---|---|---|
| `claimHandle` | `packages/db/src/accounts.ts` | Lock, then insert. It no longer relies on `onConflictDoNothing` alone |
| `changeHandle` | `accounts.ts` | Moves into a transaction with the lock, and drops the `.catch(() => [])` that treats every failure as "taken" |
| `createTeam`, `changeTeamHandle` | `packages/db/src/teams.ts` | Lock, then write |
| `handleTaken` | `accounts.ts` | Calls `handleTakenIn`. It's advisory, and the write decides |
| Tombstones | `accounts.ts`, `teams.ts` | Insert under the lock |

**Address rules.** A team address uses `handleSchema` and `isReservedHandle`, as a person's does. `GET /api/v1/handles/:handle` serves both forms. Add `team` to `RESERVED` in `packages/page/src/handle.ts`, because `tondo.page/team` could pass as Tondo's, while `teams` is already there.

**Changing a team's address.** `PATCH /api/v1/me/team`, owner only, with the same limiter as `PATCH /me/handle`. The old address stops working at once and someone else can claim it, as the Terms already say for people. The cache drops both keys, and any invitation link stops working, as below. Members' pages don't change. A suspended owner is refused, as `auth.ts` refuses today.

**Fake store.** `apps/server/src/fake-store.ts` keeps one `owners` map, so a team address goes in the same map. The real clash test has to run on Postgres, under [Testing](#testing).

## Who can edit which page

| Page | Who can edit it |
|---|---|
| A person's page, `pages.user_id` set | That person only |
| A team's page, `pages.team_id` set | That team's owner only |

The one place is a SQL condition in `packages/db/src/pages.ts`, so the check and the read or write are the same statement and can't drift apart:

```ts
const editableBy = (personId: string) =>
    or(
        eq(pages.userId, personId),
        inArray(pages.teamId, db.select({ id: teams.id }).from(teams).where(eq(teams.ownerId, personId))),
    );

// The one place that picks a page. With no id, it's the person's own main page.
const pageOf = (personId: string, pageId?: string) =>
    pageId ? and(eq(pages.id, pageId), editableBy(personId)) : mainPageOf(personId);
```

- This is the `pageOf` that M6 in `plans-implementation.md` already plans, widened by one clause.
- Every `PageStore` method that takes a person gains an optional page id, and uses `pageOf`: `findDraft`, `saveDraft`, `publish`, `unpublish`, `findOwnLive` and `statsFor`.
- A page someone can't edit answers 404, so the route doesn't reveal that it exists.
- `findDraft` uses an inner join on `users` today, which would drop a team page. It becomes left joins on `users` and `teams`, plus a join to the owner's row for `suspended`.
- A later `editors` rule would change this one clause and nothing else.
- The comment at the top of `mountPages` in `apps/server/src/pages.ts`, which says no request names a page, gets rewritten. So does the assumption in `teams-schema.md`'s "What stays the same".

**Photos follow the page, and this one is easy to miss.** Uploads go to `folderFor(person.id)`, and deleting an account removes that folder. A team page's photos must go to `folderFor(team.id)`, or they'd vanish when a former owner deletes their account. `routes.photos` and the assistant's image and photo routes gain `?page=<id>`, and a new `store.photoOwner(personId, pageId)` returns the folder's id under the same `editableBy` condition. The limit on the team's folder comes from the team's plan.

## Server routes

**Page routes.** The team page uses the same routes as everyone else. M6 plans `/api/v1/me/pages/:id` and its `publish`, `unpublish`, `check` and `live` forms, and `page(id)` helpers in `packages/contract/src/index.ts`. T2 builds that slice if M6 hasn't shipped, and M6 then doesn't redo it. The singular routes keep meaning "my main page". `stats` and `photos` take `?page=<id>`.

**Team routes.** `apps/server/src/teams.ts`, mounted from `app.ts`, with storage in `packages/db/src/teams.ts` behind a `TeamStore` interface. Writes need JSON and a session, as in `pages.ts`, and have a limiter keyed by person. People are named by address in requests, so Neon ids never reach the browser.

| Route | Who | What it does | Refusals |
|---|---|---|---|
| `GET /api/v1/me/team` | Member | Team, address, whether I'm the owner, main page id, seats and the people list | 404 when not on a team |
| `POST /api/v1/me/team` `{ handle }` | Anyone with an address | In one transaction: lock, insert team, set own `team_id`, insert main page | 409 address taken, 409 already on a team, 400 reserved |
| `PATCH /api/v1/me/team` `{ handle }` | Owner | Changes the address | 409 taken, 403 suspended |
| `DELETE /api/v1/me/team` `{ handle }` | Owner | Deletes the team, after typing its address. See [Edges](#what-happens-at-each-edge) | 400 wrong address |
| `POST /api/v1/me/team/invites` | Owner | Returns `{ url, expiresAt }`. Stores nothing | 403 not owner, `plan_limit` when unpaid |
| `GET /api/v1/invites/:token` | Public, limited by address | Team name, address, look, expiry and seats note, for the join screen | 410 expired or invalid, with one message for both |
| `POST /api/v1/me/team/join` `{ invite }` | Signed in with an address | Locks the team row, checks the token, sets `team_id` | 409 on another team, 409 team full, 410 expired, 403 suspended, 409 no address yet |
| `POST /api/v1/me/team/leave` | Member | Clears `team_id` | 409 for the owner |
| `DELETE /api/v1/me/team/people/:handle` | Owner | Clears that person's `team_id` | 409 for the owner's own row, 404 not on this team |
| `POST /api/v1/me/team/handover` `{ handle }` | Owner | Returns a signed link for that member | 404 not a member, 403 suspended |
| `POST /api/v1/me/team/takeover` `{ token }` | The named member | Sets `owner_id` to this person | 410 expired, 403 not the person named or suspended |
| `GET /api/v1/me/team/stats?days=` | Owner | See [Statistics](#statistics) | 403 |

`POST /api/v1/me/team` starts the main page from `starterPage` with the owner's current `look`, `paint` and `style`, so it begins looking like what they already chose. It's unpublished, so nobody's page changes until they publish it.

Every route that changes membership drops cache keys and, once billing exists, calls `syncSeats(teamId)` after the transaction commits. No Stripe call happens inside a database transaction.

### Signed links

`apps/server/src/invites.ts`, one concept, using `node:crypto`. A new `INVITE_SECRET` goes in `.env.example`, `render.yaml` with `generateValue`, `deploy.md` and `playwright.config.ts`.

```ts
// A token is payload.signature, both base64url. The owner and address are part of what's signed,
// so handing over the team or changing its address ends every older link, with nothing stored.
type Signed = { kind: "join"; team: string; until: number }
    | { kind: "takeover"; team: string; person: string; until: number };
const sign = (payload: string, team: { ownerId: string; handle: string }) =>
    createHmac("sha256", secret).update(`${payload}.${team.ownerId}.${team.handle}`).digest("base64url");
```

Limits of having no table, which the UI states plainly:

| Limit | What happens | What's done about it |
|---|---|---|
| A join link can't be cancelled early | It works until it expires | Links last 7 days. Changing the team's address ends them all |
| A link isn't single use | Anyone with it can join, and takes a paid seat | The screen says "Anyone with this link can join until 8 November". The owner sees new people at once and can remove them. `TEAM_MAX` caps the bill |
| Pending invitations can't be listed | The Team page shows people who've joined, and no list of who was invited | Stated on the screen |
| Someone removed can rejoin with a live link | They reappear until the link expires | Accepted at first. If it happens, one column, `invites_from`, ends older links without a table |

`TEAM_MAX = 100` sits in `packages/page/src/limits.ts`, once M1 has moved it there. It's checked under the row lock on join, and 100 is my placeholder, drawn from Liinks's ceiling.

**Handing over uses a link for a reason.** With a paid team, the new owner becomes responsible for the bill, so they should agree to it themselves. An owner naming someone and having it apply at once would take that choice away from them.

## What happens at each edge

| Event | Page and address | Shared look | Membership | Billing | Order of work |
|---|---|---|---|---|---|
| **Member leaves or is removed** | Keeps address, pages and photos | Own earlier look returns, with no writes | `team_id` null | One seat fewer, prorated | Clear, drop their cache keys, sync seats |
| **Member deletes their account** | Address, pages and counts go, as today | Not relevant | Row is gone | One seat fewer | Read `team_id` first, run today's steps, then sync seats |
| **Owner tries to leave** | Refused | | | | "Hand the team to someone else, or delete it." |
| **Owner deletes their account** | Refused until they hand over or delete the team | | | | The check goes **first**, before `removeFiles`, or photos would be lost before the foreign key refuses. The `restrict` key is the backstop |
| **Owner hands over** | Team address and pages stay | Unchanged | Both stay members, and the former owner is an ordinary member | The new owner agrees and is sent to the portal. See below | `takeover` sets `owner_id`, updates the customer's email |
| **Team deleted** | Team address and every team page go at once, and the address is free. Members keep theirs | Everyone's own look returns | All `team_id` null through the foreign key | Subscription cancelled first, with no refund for the rest of the period | Cancel Stripe, remove `folderFor(team.id)`, delete the row, drop every key. Stats go with the pages |
| **Subscription lapses** | Nothing goes offline | Stays 30 days, then stops | Stays | See [Downgrade](#when-a-team-plan-ends) | Derived on read, no job |
| **Owner suspended** | Personal page and team pages stop being served | Stops, so members show their own | Unchanged | Reminder printed, as for a person | `suspend.ts` |
| **Member suspended** | Their page stops being served | Others unaffected | Unchanged, and the seat still counts | Unchanged | Today's behaviour |

**Why deleting has an order.** Today's account deletion removes photos before the page, because that can be retried. Team deletion follows the same idea: Stripe, then files, then the row. If Stripe can't be reached, nothing has been removed and the person can try again, following M5's `cancelBilling`. `store.removeUser` is unchanged.

**Taking down a team page has no column.** Only the owner can edit a team page, so its content is the owner's responsibility, and `findLive` reads the owner's `suspended_at`. `packages/db/src/suspend.ts` learns to accept a team address, resolves it to the owner, and prints that the owner's personal page goes too. The cost is that a problem on the owner's personal page also takes the team's page down, and the shared look with it. To stop this being sidestepped:

- A suspended owner can't hand over or change the address.
- Deleting a team whose owner is suspended inserts a `removed:<handle>` row in `users`, reusing today's tombstone, so the address stays out of use.

**The Team section can go stale.** `team` block items are the owner's own words and links, so someone who deletes their account leaves a link that shows "We couldn't find that page" until the owner changes it. Someone who leaves keeps their address, so their link still works.

## The shared look

### Which fields are shared

| Field | Shared | Why |
|---|---|---|
| `look` | Yes | The point of the feature |
| `paint` | Yes | The chosen colours belong to the look |
| `style.colour`, `font`, `shape`, `fill`, `bg`, `bgPhoto` | Yes, the whole of `style` | These are the "Make it yours" choices, and partly merging them would produce pairings nobody chose |
| `seed` | No | Each person's painting should differ, as the demo on `/teams` shows |
| `header`, including `layout`, `wordmark`, `name`, `photo` and `links` | No | Their name and face. `layout` is a judgement, and an open decision below |
| `blocks`, including `tint` and variants | No | "Everyone keeps their own words, photos and links" |
| `title`, `description`, `timeZone` | No | Per page |

Members can still change everything in that "No" list, including Paint it again.

### The merge

**New file `packages/page/src/team-look.ts`.** The team's own value is used even when it's absent, so a member's own `paint` or `style` can't show through a team that uses the look's defaults. The sketch in `teams-schema.md` would have left `paint` behind.

```ts
export type TeamLook = Pick<Page, "look" | "paint" | "style">;

export const teamLookOf = ({ look, paint, style }: Page): TeamLook => ({
    look,
    ...(paint ? { paint } : {}),
    ...(style ? { style } : {}),
});

export function withTeamLook(page: Page, team: TeamLook | null): Page {
    if (!team) return page;
    const { paint: _paint, style: _style, ...own } = page;
    return { ...own, ...team };
}
```

**`packages/render` doesn't change.** `themeOf`, `lookCss`, `recolourHtml`, `guardRules` and `fontsHref` in `style.ts` all read `look` and `style` from the page they're given, so a merged page gets the contrast rules on its own terms. A team's `bgPhoto` lives in the team's folder and is served from the same `/photos/` route, so the page policy doesn't change.

### On the live page

`findLive` in `packages/db/src/pages.ts`:

```sql
-- A person's page. A person's address is tried first, then a team's.
select p.id, p.published, t.published as team_page
from pages p
join users u on p.user_id = u.id
left join teams tm on tm.id = u.team_id
left join users o on o.id = tm.owner_id and o.suspended_at is null
left join pages t on t.team_id = tm.id and t.slug = '' and o.id is not null
where u.handle = $1 and p.slug = $2 and u.suspended_at is null;

-- A team's page.
select p.id, p.published, t.published as team_page
from pages p
join teams tm on p.team_id = tm.id
join users o on o.id = tm.owner_id
join pages t on t.team_id = tm.id and t.slug = ''
where tm.handle = $1 and p.slug = $2 and o.suspended_at is null;
```

`LivePage` gains `teamLook: TeamLook | null`, from `teamLookOf` on `team_page`, or null when that isn't published. `live()` in `apps/server/src/app.ts` applies `withTeamLook` and then, once plans exist, `stepDown`, in that order, so the step-down judges what visitors would see. Once billing exists, the store also returns the team's `plan` and `ends_at`, so the merge can stop at the end of the 30 days.

### How a change reaches every page

"Change the look once, and every page follows" works like this: the owner edits the team page and presses Publish. Saving a draft changes nothing for anyone, as with any page.

1. `publish` writes `published` on the team's main page. No other row is touched.
2. `onPublishChange` in `app.ts` takes the page id and drops the cache for the team's address and every member's address. A new `store.handlesAffected(pageId)` returns those: only the owner's handle for a personal page, and all of them for a team's main page.
3. The next visit to each page reads the new look. There's no publish step for members, and their draft and `updated_at` aren't touched, so an open tab gets no false "changed somewhere else".

The same drop runs on unpublishing the team page, joining, leaving, removal, deleting a team, and a plan change. With sub-pages, it uses M6's `dropAll(prefix)`.

**Limits.**

- **Another instance can be 15 seconds behind.** `PAGE_CACHE_MS` is per process and `deploy.md` runs one instance, so this only matters if a second is added. The cache's drop would need to reach both.
- **A member's open editor keeps the old look** until they reload. Their page is still right for visitors.
- **Publish tells the owner what will happen.** The panel adds "This also changes the look on 4 other pages." `how-it-works.md` says "on the next publish", which is true if it means the owner's, and it gets reworded in T4.

### In the editor

A merged document must never be saved. If `findDraft` or `live` returned one, the next autosave, or Discard changes, would write the team's look into the member's document and lose their own.

- `DraftResponse` and `LiveResponse` in `packages/contract/src/index.ts` keep returning the person's own document, and gain `teamLook` and `handle`.
- `apps/editor/src/components/Canvas.tsx`, `Preview.tsx`, `HomePage.tsx`, `PublishPanel.tsx` and `LivePage.tsx` draw `withTeamLook(page, teamLook)`. Editor state stays unmerged.
- `LookPanel.tsx` shows a read-only card for members: "Your page uses Aster & Bell's look. Your words, photos and links stay yours." `MakeItYours` and `LookTiles` don't show. Paint it again stays. The owner sees this on their own personal page too, with a link to edit the team page.
- `pageHash`, "Live, with unpublished changes" and Discard all compare unmerged documents, so they keep working.
- With no published team page, `teamLook` is null and a member sees their own controls, with a line saying the team hasn't published its look yet.

**A lock in the UI is enough.** Whatever a member's document holds, visitors get the team's look, so the server needs no save-time check. It also means their own look is intact when they leave.

**Help me.** `set_look` and `set_style` in `packages/page/src/assistant-tools.ts` should refuse for a member, so the assistant doesn't report a change that visitors will never see. `assistant.ts` reads `teamLook` for the person and passes a `lookLocked` flag into `runTurn`. The refusal reads "Your team's look is set on the team's page." For the owner editing the team page, images and picked photos go to the team's folder.

## In the app

### Nav

`apps/editor/src/app/nav.ts` gains one line, and `Shell.tsx` one case:

```ts
{ id: "team", label: "Team", icon: "people", group: "manage", path: "/team" },
```

The nav's own rule is that an item appears only once its feature works, and items never move. `MeResponse` gains `teams: boolean`, from a server `TEAMS_ON` setting, and `Shell.tsx` filters this item while it's off. `TEAMS_ON` is removed once Teams is on sale. On a phone it appears through `inMore`, which already lists everything but Home and Analytics. `NavIcon` in `Parts.tsx` gains `people`. `Shell.tsx`'s `here` lookup covers `/team`, and `/join` needs its own title.

### The Team page

New `apps/editor/src/components/TeamPage.tsx`, read through `GET /api/v1/me/team`. Three states:

| State | What it shows |
|---|---|
| Not on a team | One line on what a team is, a name for the address with the existing live availability check, and "Make a team" |
| Owner | Team name and address with an open link. **Edit team page**, leading to `/app/edit?page=<id>`. People, with name, address and either "Owner" or a Remove button. **Invite someone**. Statistics. Below that: Change address, Hand over, Delete team |
| Member | Team name and address. People, without Remove. "Leave team" |

**Invite someone** makes a link and shows it with Copy: "Anyone with this link can join Aster & Bell until 8 November. Each person who joins adds a seat." Once billing exists, the seat sentence includes the price.

**Remove** confirms: "Rae keeps her address and page, and her page goes back to its own look."

**Leave** confirms: "You keep your address and page, and your page goes back to its own look."

**Delete team** asks for the team's address to be typed, as account deletion does. It says the team's page and address go, and that everyone keeps their own.

**Empty and unpublished team page.** Until the team page is published, the owner sees "Publish your team's page to share its look with everyone."

**An optional last step, and the first to cut:** "Add everyone to the Team section" on the owner's view inserts a `team` block with each person's name and a link. It's an ordinary edit to the draft, so the owner reviews it. The block allows 12 people and 30-character names, so longer teams get a second block and long names are cut. It also takes each person's own header photo.

### Editing the team page

The same builder, with no second editor.

| File | Change |
|---|---|
| `apps/editor/src/main.tsx`, `app/builder.tsx` | Reads `?page=<id>` and passes it to `loadDraft` |
| `apps/editor/src/lib/api.ts` | `loadDraft`, `saveDraft`, `publish`, `loadLive`, `loadPublishChecks`, `unpublish`, `loadStats`, `loadPhotos` and `uploadPhoto` take a page id |
| `apps/editor/src/state/saver.ts`, `document.ts` | Carry the id |
| `apps/editor/src/state/storage.ts` | Backups keyed by page id, or two pages would overwrite each other. Existing keys are read once as the main page. Same as M6 |
| `Editor.tsx`, `TopBar.tsx`, `PublishPanel.tsx` | Show `draft.handle`, not `account.handle`, in the address, links and downloads. The top bar's back link returns to `/team` |
| `SettingsPage.tsx` | The team page's title and description are reached from the builder's page settings. Changing the team's address stays on the Team page |

### The member's experience

- **Home** gains one line under the address: "Part of Aster & Bell. Your page uses the team's look." Nothing else moves.
- **The builder** shows the read-only look card.
- **Analytics** stays their own.
- **The Team page** shows who's there, and how to leave.
- **Being removed.** There's no email yet, so they find out when they next open the app, where the Team page shows the empty state.
- **Plan.** The Account page says "Included in Aster & Bell's Team plan", and they see no price or billing controls.

## Joining

### The link

`https://tondo.page/app/join?invite=<token>`. No cookie is set: the privacy policy says Tondo sets cookies only for signing in, and the sign-up pages already carry `?handle=` through every step, so `invite` follows the same path.

| Step | File | Change |
|---|---|---|
| Not signed in | `apps/editor/src/lib/account.ts` | `loadAccount` sends a `/join` visit to `/signup?invite=<token>`, not `/login` |
| Sign-up and log-in | `apps/marketing/src/lib/auth-form.ts`, `signup.astro`, `login.astro` | Reads `invite`, shows "Join Aster & Bell on Tondo" from the public route, and keeps it on links between the two pages |
| Email code | `auth-form.ts` | `savePending` gains `invite`, so it survives the verify step |
| After signing in | `auth-form.ts`, `goOn` | Continues to `/app/join?invite=...`, alongside the existing `handle` |
| Google | `auth-form.ts`, `apps/server/src/auth.ts` | `back.searchParams.set("invite", ...)`, and `routes.authReturn` passes it on. Validate it as a token, since it's going into a redirect |
| Has no address | `apps/editor/src/main.tsx` | Already replaces with `/start${location.search}`, which keeps `invite` |
| Has an address | `Shell.tsx`, new `JoinPage.tsx` | The confirmation screen |

### For someone new

`mountStart` in `app/builder.tsx` reads `invite`, and `StartFlow.tsx` gains an optional `team` prop from the public route. The flow shows the team's name, skips the look step, since that choice wouldn't show, and previews with `withTeamLook`. `finish` claims the address and then joins.

These are two requests on purpose. If the join fails, because the link expired for instance, they still have their page and see "This invitation has ended. Ask the owner for a new link." Their own look is the starter's default, which returns if they leave.

### For someone with a page

`JoinPage.tsx` shows the team's name, then their own page before and after in the team's look, and:

> Your page will use Aster & Bell's look. Your words, photos and links stay yours, and your own look comes back if you leave. The owner of the team will see your page's views and clicks.

With "Join Aster & Bell" and "Not now". If they're already on another team: "You're on Field Office. Leave it first to join this one." If they're on this team, it goes straight to the Team page. If they have Pro, see [Who pays](#who-pays-when-a-pro-user-joins).

Joining changes a live page at once, with no publish, because that's what the shared look means, and this screen is where they agree to it.

## Invitations and email

**Now: a link the owner copies.** It needs no email provider, and it's the whole of the first version. Neon's mail only covers Neon's own flows, and `roadmap.md` step 3 hasn't chosen a provider.

**Later, once a provider exists:**

- The invite box gains an optional email field. The server sends the same link, and stores nothing.
- A note to someone removed, or to an owner when a person joins.
- The step-down warning for a lapsed team, which `plans-implementation.md` already treats as needed before charging.

None of this changes the schema or the link format.

## Statistics

**Owner only**, on the Team page. `store.teamStats(teamId, days)` in `packages/db/src/teams.ts`:

```sql
select p.id, coalesce(u.handle, tm.handle) as handle, p.slug, s.target, s.day, s.count
from pages p
left join users u on p.user_id = u.id
join teams tm on tm.id = coalesce(p.team_id, u.team_id)
join stats s on s.page_id = p.id
where tm.id = $1 and s.day >= $2;
```

Each page's rows go through the existing `summarise`, which gives a total line plus one row per person: address, views and clicks. Range is 7, 30 or 90 days, clamped by M1's `statsDays` from the team's plan, and defaults to 30. It doesn't list individual links, since a page's links are named from its live copy, and the owner has no need for them.

Limits of deriving this:

- **Totals change when someone leaves.** Their numbers leave with them, and past periods change too.
- **A person's earlier numbers count.** There's no `joined_at`, so a new member's views from before joining appear in range. The join screen says the owner will see their numbers, and the privacy policy does too.

`AnalyticsPage.tsx` stays per page. When the owner opens the team page's analytics through `?page=<id>`, it shows the team page alone.

## Multi-page

Sub-pages come from M6, and teams use them as follows.

| Question | Answer |
|---|---|
| Whose look does a member's sub-page take? | The team's main page, like their main page |
| A team's own sub-pages | At `/asterandbell/shop`, also taking the main page's look. Their look panel shows "Change this on the team's main page" |
| How many? | 25 on the team's address, counted by `pages.team_id`, and 10 per person, as `plans.md` says |
| Who edits them? | The owner, through `editableBy`, with no further work |
| Switching in the builder | M6's switcher lists the person's pages, then the team's for the owner, under the team's address |
| Publishing a team sub-page | Drops that key only. The team's look changes only with the main page |
| Leaving with several pages | All stay theirs. If they're now on Free, extra pages stay live and read-only, as M6 says for a downgrade |
| Before M6 | One team page, one page per person, and nothing else differs. `/teams` and pricing don't say 25 until M6 and T8 are done |

`canAddPage` takes `{ pages: 25, drafts: 0 }` for a team. M6's `listPages` and `createPage` accept the team's id under `editableBy`.

## Plans and billing

**Replaced by the flat Pro plan, see the note at the top.** The text below is the earlier per-seat design.

This replaces the "Team billing" section of `plans-implementation.md`, whose text assumes a team is a `users` row. Update that section to point here in T7.

### What Team includes

| | A member on Team | The team's address |
|---|---|---|
| Limits | Same as Pro: 10 pages, all looks, 2,000 photos, 90 days, no mark, all sections | 25 pages, plus the same design and section rights, and 2,000 photos in its folder |
| Help me credits | 100 a person, as `ai-chat.md` proposes | Spent from whoever's editing |
| Team only | Shared look, Team page, invitation links, team statistics | |
| Not in this version | Roles and duplicating a page, which `plans.md` lists under Team and should be taken out | |

### Fit with `limits.ts`

M1 moves plan limits to `packages/page/src/limits.ts`. Today's `apps/server/src/limits.ts` also has `credits`, added by the AI chat work, which M1's `Limits` doesn't list. **M1 has to keep it**, or Help me loses its limit. The sketch in `plans.md` that tests an id for `team:` goes away, because a team is no longer a `users` row.

```ts
export const TEAM_PAGES = 25;
export const TEAM_MAX = 100;
export const PRICES = { pro: { month: 6, year: 60 }, team: { month: 4 } } as const;

type Standing = { plan: Plan; endsAt: Date | null };

// A person gets whichever is better while it lasts, so a member who also pays for Pro loses nothing.
export function limitsFor(own: Standing, team: Standing | null, now: Date): Limits & { designUntil: Date | null };

/** For pages a team owns. */
export function teamLimitsFor(team: Standing, now: Date): Limits & { designUntil: Date | null };

/** Whether the shared look still applies: a paid team, or within 30 days of its end. */
export const teamLookApplies: (team: Standing, now: Date) => boolean;
```

With `PLANS_ON=false`, `limitsOf` treats everyone as Pro, and `teamLookApplies` is true for any team. Every enforcement point in M1's table reads through this. `Draft`, `LivePage` and `/me` gain the team's standing, because their queries now join it.

### Stripe

Team uses M5's objects and code.

| Piece | Change |
|---|---|
| Price | `team_month`, $4 a seat monthly, on Tondo Team. Monthly only, since `plans.md` states no yearly price |
| Customer | One per team, stored in `teams.stripe_id`, idempotency key `customer-team-<id>`, with the owner's session email |
| Checkout | `POST /api/v1/me/billing/checkout` gains `for: "team"`, owner only. `quantity` is `max(seats, TEAM_MINIMUM)`, with no adjustable quantity |
| `setPlan` | Finds the customer on `users`, then on `teams`, and returns the handles to drop |
| `syncPlan` | Unchanged apart from that. `planOf` reads `team` from the lookup key |
| Portal | A second configuration with cards, invoices and cancelling, and no plan switching or quantity. `billingPortal.sessions.create` takes its id as `configuration`, set in `STRIPE_TEAM_PORTAL`. The owner creates it |
| Deletion | M5's `cancelBilling` takes a customer id, and also runs when a team is deleted |

**Seats, in `apps/server/src/stripe.ts`:**

```ts
export async function syncSeats(teamId: string): Promise<void> {
    const team = await teams.billing(teamId);
    const sub = team?.stripeId ? await paidSubscription(team.stripeId) : null;
    const item = sub?.items.data[0];
    if (!sub || !item) return;
    const quantity = Math.max(await teams.seats(teamId), TEAM_MINIMUM);
    if (item.quantity === quantity) return;
    await client.subscriptions.update(sub.id, {
        items: [{ id: item.id, quantity }],
        proration_behavior: "create_prorations",
    });
}
```

- **When it runs.** After a join, leave, removal or member's account deletion commits, and on every subscription webhook.
- **Drift heals itself.** It reads the count every time. If two joins race and the lower count lands last, the resulting `customer.subscription.updated` event runs it again and corrects it. If Stripe is down at join, the person still joins, an error is logged, and opening the owner's Team page runs it again.
- **Proration.** Stripe's docs list a quantity change as prorating by default, and a charge or credit lands on the next invoice. So someone joining mid-month costs part of $4 at the next bill, and it isn't charged at the moment of joining.
- **Below the minimum.** With 3 people or fewer the quantity stays at 3, so one person leaving a team of 3 changes nothing. The Team page says "$12 a month covers up to 3 people."
- **Churn.** Adding and removing people repeatedly creates small invoice items, not charges. I'd accept that at this size.

### Who pays when a Pro user joins

The team pays for their seat from the moment they join. Their own Pro doesn't stop by itself, since nobody should have a subscription changed without saying so, and Tondo shouldn't keep charging them for something the team now covers either. So the join screen shows, only for someone with an active Pro subscription:

> You pay for Pro until 3 December. The team's plan includes everything in Pro, so you can stop it. It ends on that date, and there's no refund for the time left.

With two buttons of equal weight: "Join and stop my Pro", which sets `cancel_at_period_end: true`, and "Join and keep my Pro". Neither is preselected. It's the same for an owner with Pro on starting Team checkout.

If they leave after stopping it, they're on Free under the existing rules, and their own grace period started when Pro ended. Keeping Pro means a leaver stays on Pro with nothing to do.

### When a team plan ends

Failed payments follow M5: Smart Retries, then `canceled`, then `teams.ends_at`.

| Item | When the plan ends | After 30 days |
|---|---|---|
| Team address and main page | Stay live | Stay live, with the design stepped down |
| Team's sub-pages | Live and read-only | Same |
| Shared look on members' pages | Stays | Stops. Each person shows their own look, stepped down if their own plan doesn't allow it |
| Members' limits | Their own plan's, at once, and the mark returns on Free | Same |
| Members' extra pages | Live and read-only on Free | Same, with step-down |
| Membership | Stays | Stays |
| New invitations and joins | Refused | Refused |
| Paying again | Everything returns at once, with `quantity` set from the current count | Same |

A member's design grace is the later of their own and the team's, so someone who stopped Pro a year ago doesn't step down on the day the team ends. No document is rewritten at any stage.

The team's address stays online on no plan, in keeping with "a live page never goes offline for a billing reason". It's one free page per former paying team, which I'd accept.

### Gating at creation

Following "try it, and pay when it goes live":

| Action | `PLANS_ON=false` | `PLANS_ON=true`, unpaid team | Paid team |
|---|---|---|---|
| Make a team and hold its address | Yes | Yes | Yes |
| Build and preview the team page | Yes | Yes | Yes |
| Publish the team page | Yes | Refused, with `plan_limit`, and a "Start Team, $12 a month for up to 3 people" panel | Yes |
| Make an invitation link, or join | Yes | Refused, with `plan_limit` | Yes |

Unlike Pro, there's no "Publish with free choices", because the team's address is the thing being paid for. Holding an address without paying means one free person can hold two. They could already hold one forever, and I'd accept this for now.

**Teams made before charging opens.** `comp.ts`, from M1, gains `--team <address>`, which sets `plan: 'team'` and `ends_at` 12 months ahead with no `stripe_id`, matching the private release rule. `syncSeats` returns at once for these.

### Owner handover and the card

The card on a team's Stripe customer belongs to the old owner, and handing over mustn't leave them paying. `takeover`:

1. Sets `owner_id`.
2. Updates the customer's email to the new owner's session email.
3. Clears `invoice_settings.default_payment_method` and detaches the customer's payment methods.
4. Sends the new owner to the portal to add a card, after they've agreed: "You're taking over Aster & Bell's plan, $20 a month for 5 people. Add your card to carry on."

If they don't add one, the next invoice fails, and the normal retries and downgrade apply. Past invoices stay on that customer, so the new owner can see them. Billing details on them, such as a company name, need checking in the sandbox pass, and it's the part of this plan I'm least sure of.

## Dependencies

| Milestone | Needs | Can ship before Stripe? |
|---|---|---|
| T1 to T6 | Nothing from the plans milestones. T2 shares a slice with M6 | **Yes.** With `TEAMS_ON` set only where wanted, and `PLANS_ON=false`, it's all free |
| T7, seats and billing | **M1** for columns, `limitsFor`, `/me` and `comp.ts`. **M2** for `stepDown` and `paidUses`. **M4** for the mark and live step-down. **M5** for `stripe.ts`, `billing.ts`, the webhook, the stand-in, `cancelBilling` and the sandbox | No |
| T8, 25 team pages | **M6** and T7 | No, not as a promise |
| T9, on sale | **M7** live setup, T7, T8 | No |

## Testing

### Unit, in `pnpm check`

| File | Covers |
|---|---|
| `packages/page/src/team-look.test.ts` | Shared fields replaced, per-page fields kept, a member's `paint` and `style` removed when the team has none, null team returns the page, input unchanged. `seed` differs across people |
| `packages/page/src/limits.test.ts` | Better of own and team, the later grace, `teamLookApplies` at exact moments, 25 pages |
| `packages/page/src/handle.test.ts` | `team` reserved |
| `apps/server/src/invites.test.ts` | Round trip, expired, altered payload, changed owner, changed address, a join token used as a takeover token |
| `apps/server/src/teams.test.ts` | Every route: signed out, not owner, wrong team, not JSON. Owner can't leave. Account deletion refused for an owner **before any photo is removed** |
| `apps/server/src/pages.test.ts` | A member's draft stays unmerged after a save, and `live` returns the own document |
| `apps/server/src/billing.test.ts` | `syncSeats`: no change when equal, the minimum, no subscription, Stripe failure doesn't fail a join |

`fake-store.ts` gains a `TeamStore`. **Authorisation and the address lock are SQL, so a fake can't prove them.** Those tests go in e2e against the Docker Postgres.

### Neon stand-in

`tests/neon-stand-in.ts` already holds many people and sessions, so it needs no new routes. Tests use one browser context per person. The Organization routes aren't added, because Tondo doesn't use them.

### Stripe stand-in

Extends `tests/stripe-stand-in.ts`, from M5: quantity updates with a record of `proration_behavior`, `cancel_at_period_end`, customer email update, payment method detach, and `configuration` on portal sessions. A new control sets a team's subscription to ended. Run with `PLANS_ON=true`.

### End to end, `tests/teams.spec.ts`, both viewports

1. **Authorisation table, against real Postgres.** For owner, member, ex-member and stranger, every page route on the team page and on each other's personal pages. Only the listed cases pass, and the rest answer 404.
2. **Address clash.** A team and a person claim the same address at once, 20 times with `Promise.all`. Exactly one wins each time. Also a change of address into a team's address, and a team's into a person's.
3. **Look reaches every page.** Owner publishes a new look, three live pages show it at once with no wait, and each keeps its own words and painting. No page has `<script`. Member's draft and `updated_at` are unchanged.
4. **Own look returns** on leaving, on removal and on deleting the team.
5. **Team page unpublished,** so members show their own.
6. **Editor.** The member's look panel is locked, the preview shows the team's look, autosave doesn't change the stored look, and Discard doesn't bring it in.
7. **Invite through new sign-up,** by email with the code, through the start flow, ending on the team. Expired link, with the page kept. Someone signed in with a page. Someone on another team. Google's return, at route level.
8. **Edges.** Owner can't leave or delete an account until handing over. Handover with a second context. Team delete with the address freed. Member deletes account and the seat count falls.
9. **Photos.** A team page photo survives the former owner deleting their account.
10. **Suspension.** Owner's suspension takes the team page and shared look down. A suspended owner can't hand over. Deleting that team keeps the address out of use.
11. **With plans on.** Unpaid team can't publish or invite. Checkout, seat count follows joins and leaves, the minimum of 3. Pro joiner's two choices. Lapse, day 10 and day 31, restored by paying.
12. **Multi-page.** A member's and a team's sub-page take the look, and the 26th team page is refused.

### Real pass in a Stripe sandbox, by hand, in T7

The stand-in can't prove Stripe behaves as I've read. I read the proration page and the portal session reference for this plan, and nothing has run against a real account. Test clocks, with cases for: seat added mid-period and the next invoice's proration, seat removed and the credit, below the minimum, handover with the card detached and the customer's email changed, a failed renewal to `ends_at`, a team-only portal offering no plan change, and `cancel_at_period_end` on a joiner's Pro.

### Lab and QA

`qa.md` gains a Teams section in T9, re-read first, since others edit it. It covers the team look on real content on a phone, with people who have and don't have photos, and each `header.layout` against signature looks. Add a team state to `PlanLab.tsx`.

## Pricing and `/teams` copy

Only change these when the thing is true on production. All drafts below can be edited.

**`apps/marketing/src/pages/teams.astro`.** These need to change even before launch, in T1's commit if it ships, because they promise things the decided design doesn't do:

| Today | Change |
|---|---|
| `roles`: Owner, Editor, Member, and "We're planning three roles" | Two: "Owner: manages the people on the team, the team's page and its look, and the plan." "Member: edits their own page. The team's look stays as it is." Intro: "Each team has one owner, and everyone edits their own page." |
| `members` sketch shows Rae Bell as "Editor" | "Member" |
| Coming: "One account that holds a page for each person" | "A team that each person joins with their own account and page." |
| Coming: "Owner, editor and member roles" | Remove |
| Coming: "Invitation links, so people can sign in to the page made for them" | "Invitation links, so people can join with their page or make a new one." |
| Coming: "Duplicating a page to start the next person's" | Remove |
| Clubs: "A page for each coach or squad" | "A page for each coach, kept consistent by whoever looks after the club's page." |
| FAQ, "Could pages we make today join a team later?" | "Yes. Joining keeps your page and address, and your own look comes back if you leave." Only once T5 ships |

**At T9, when it's on sale:**

- `Status` labels come off, and the demonstration note goes.
- `today` and `coming` become what a team gets now, with "A team look that reaches every page" stated as: "Publish the team's page, and its look reaches everyone's page."
- FAQ, "What will teams cost?": "$4 a person a month, from 3 people. Seats follow who's on the team, and changes are prorated on your next invoice."
- FAQ, new: "What happens to my page if I leave?" "You keep your address, your page and your photos, and your own look comes back."

**`apps/marketing/src/pages/pricing.astro`, and `data/plans.ts` from M0:**

- Team's price stops being "Planned" at T9.
- A Team group: "An address for the team", "A shared look", "Invitation links", "Team totals".
- "25 pages on the team's address" comes in at T8 or T9, whichever's later.
- `apps/marketing/src/data/plans.test.ts` also checks `TEAM_PAGES` and `TEAM_MINIMUM`.
- No "roles" or "duplicate a page" rows.

## Terms and privacy

For the owner to approve, ideally with a lawyer. I'm not one. They ship in T9, or in T5 if teams open privately before then. These add to the text in `plans-implementation.md`.

**`terms.astro`, new section "Teams":**

> A team has one owner, who's responsible for the team's page and address and for paying for the team. Each member stays responsible for their own page, and keeps their own account and address.
>
> When you join a team, your live page uses the look of the team's page for as long as you're on it, and the owner can see your page's views and clicks. You can leave at any time. If you leave or are removed, you keep your address and page, and your own look returns.
>
> The owner can remove members, delete the team or hand it to another member who accepts. Deleting a team removes its address and pages straight away. An owner has to hand over or delete their team before deleting their account.
>
> A team's price depends on how many people are on it, and changes during a billing period are charged or credited on the next invoice. Anyone with an invitation link can join until it expires, so please share it with care.
>
> If we take down a team's page, the owner's own page may go too, because the owner controls both.

**`terms.astro`, "Addresses".** State that the rules for addresses cover team addresses too, and that a team's address belongs to the team's account while it's in good standing.

**`terms.astro`, "Ending and deletion".** Add the sentence on owners from above.

**`privacy.astro`, `#visits`.** "The owner sees totals" gains: "If your page is on a team, the team's owner also sees your page's totals, including from before you joined. Those stop when you leave."

**`privacy.astro`, `#what-we-collect`.** Add: "Team membership: which team your account is on, and who owns it. Other members can see your name and address as they appear on your page." **`#cookies` doesn't change,** since invitations use no cookie. Update the "Last updated" date.

## Other docs

| File | Change | When |
|---|---|---|
| `data-model.md` | Tables, and the trade-off saying the address moves into its own table | T1 |
| `features.md` | Decision 1, which says teams move the address, and the team rows | T1 |
| `how-it-works.md` | "Teams" section and "on the next publish" | T4 |
| `plans.md`, `plans-implementation.md` | Option C assumptions, roles and duplicate under Team, `0003` | T7 |
| `ai-chat.md` | "Teams are unmodelled" in the Gating table | T7 |
| `deploy.md` | `INVITE_SECRET`, `TEAMS_ON`, `STRIPE_TEAM_PORTAL` | When each is added |
| `boundaries.json` | No change | |

## Milestones

Each one ships alone, and passes `pnpm check` and `pnpm e2e`. Sizes are estimates for one developer.

| # | Milestone | Main files | Size (estimate) | Ships as |
|---|---|---|---|---|
| T1 | Migration, `handles.ts`, lock on all writes, `team` reserved, `/teams` copy correction, doc updates | `schema.ts`, `accounts.ts`, `handle.ts`, `teams.astro` | 2 to 3 days | Dark, apart from honest copy |
| T2 | `editableBy`, page routes by id, photos by page, backups by page id | `pages.ts` in `db` and `server`, `photos.ts`, `contract`, `api.ts`, `storage.ts` | 2 to 3 days. Less if M6 got there first | Dark |
| T3 | Team store and routes, signed links, edges, suspension, account deletion check | `teams.ts` in `db` and `server`, `invites.ts`, `auth.ts`, `suspend.ts` | 4 to 5 days | Dark, behind `TEAMS_ON` |
| T4 | Merge, `findLive`, cache drops, editor lock, Help me refusal | `team-look.ts`, `app.ts`, `LookPanel.tsx`, `Canvas.tsx`, `assistant.ts` | 3 to 4 days | Dark |
| T5 | Nav, Team page, team page in the builder, join through sign-up and start, member's experience | `nav.ts`, `Shell.tsx`, `TeamPage.tsx`, `JoinPage.tsx`, `auth-form.ts`, `StartFlow.tsx` | 5 to 6 days | Usable wherever `TEAMS_ON` is set, for free |
| T6 | Team statistics | `teams.ts`, `TeamPage.tsx` | 1 to 2 days | Same |
| T7 | Billing migration, limits, `syncSeats`, checkout, portal, joining with Pro, lapse, handover with card, sandbox pass. **This is M8** | `limits.ts`, `stripe.ts`, `billing.ts` | 5 to 6 days | Dark, with `team_month` not offered |
| T8 | 25 team pages, switcher and look on sub-pages | M6's files | 2 to 3 days | Dark until T9 |
| T9 | Terms, privacy, pricing, `/teams`, QA, owner's Stripe steps, `TEAMS_ON` removed | `terms.astro`, `privacy.astro`, `pricing.astro`, `teams.astro`, `qa.md` | 1 to 2 days, plus the owner's steps | On sale |

T1 to T6 come to about 17 to 23 days, and all of it to about 25 to 34 days, so 5 to 7 weeks. For comparison, `teams-schema.md` estimated 2 to 3 weeks of schema and server work for option A, the nearest shape, plus 2 to 3 for screens and invitations. T1 to T6 here come out at or just below that.

### Sequence

```
AI chat Phase 1 lands
  │
  M0, M1 ── M2, M3, M4, M5 ── M6 ──┬── T1 ─ T2 ─ T3 ─ T4 ─ T5 ─ T6 ──┐
                                   │                                  ├── T7 ── T8 ── T9
                                   └── M7, charging opens for Pro ────┘
```

**Recommended:** after M6, because T2 then shrinks to one clause and T8 has what it needs, and because `roadmap.md` and `/teams` both place teams after the private release. Charging for Pro doesn't have to wait for any of it.

**If teams should come sooner,** T1 to T6 can run beside M2 to M5, with T2 building M6's server slice. M6 then has less to do, and the size overall doesn't change much. The conflicts to expect are in `pages.ts`, `app.ts` and `contract`.

**With the AI chat work running now.** It has uncommitted changes in `apps/server/src/app.ts`, `index.ts` and `limits.ts`, `packages/contract/src/index.ts`, `packages/page/src/index.ts`, `packages/render/src/index.ts`, `boundaries.json`, `tests/editor.spec.ts` and the editor's styles. Don't start T1 until those are committed. Only one milestone at a time should generate a migration, since that agent has just added `0003` and M1 adds the next. T4's change to `assistant-tools.ts` waits until Phase 1 of the chat has landed.

**In parallel, within Teams:** T3 and T4 can run together after T2, sharing only `app.ts`. T5 follows both. T6 can run beside T5.

## Risks

| Risk | What could happen | What to do |
|---|---|---|
| **An address exists in both tables** | A write skips the lock, and two owners share one address, with the person's page winning at read | All writes go through `handles.ts`. The clash test covers each one. `handleTakenIn` is the only reader |
| **Editing someone else's page** | The first time a request names a page. A mistake exposes other people's work | One SQL condition, 404s, and the full table on real Postgres |
| **A merged page gets saved** | A member's own look is lost, with no warning | API never returns a merged document. Tests for autosave and Discard |
| **Paying for strangers** | A forwarded link adds seats to the owner's bill | 7 days, plain wording, removal, and `TEAM_MAX`. It can't be fully prevented without a table or an email check. If it happens, add `invites_from` |
| **Billing drift** | Quantity differs from the count, and the owner is under or overcharged | `syncSeats` reads the count on every event, and on opening the Team page. No scheduled check, so a quiet team could stay wrong until the next event |
| **Handover and the card** | The old owner keeps paying, or invoices show their details | The new owner agrees and adds a card, and old methods are detached. Sandbox pass. This is the part I'm least sure of |
| **Owner disappears** | Nobody can hand over, and the team's look can't change | Support does it by hand with `takeover`'s store call. There's no self-serve route |
| **Owner's suspension takes down the team** | Members lose the shared look because of the owner's personal page | Accepted to avoid a column. Members' pages stay online with their own looks. `suspended_at` on `teams` is the fix if it matters |
| **The team's look doesn't suit a member's page** | A signature look's header with someone's chosen `layout` or no photo looks wrong | `layout` stays with each person, and `qa.md` checks it. Every look already renders every header layout, though not with these combinations on real content |
| **Live pages change without their owner acting** | A member's page changes when the owner publishes | That's the promise, and the join screen says so. There's no notice on each change |
| **`users.team_id` is hard to outgrow** | Someone wants to run two teams | `members` is a small later migration. A personal page and a team page already coexist, so this is less pressing than it was under option C |
| **Future tables need a team too** | `contacts` and `connections` are planned with `user_id`, and a team page would want them | Same pattern as `pages`, deciding when each arrives |
| **Neon's Organization routes** | Stray rows in Neon's tables, unread by Tondo | The setting below |
| **Other agents in this tree** | Conflicts in `app.ts`, `contract` and `Editor.tsx` | The sequence above, re-reading first, and committing only your own files |

## Decisions still open

1. **`ends_at` on `teams`, and adding `plan` and `stripe_id` only at T7.** The first is a column beyond the owner's list, and it's needed for the 30-day rule. The second keeps to "no column until used". **Recommendation:** both. If you'd rather have your full shape in the first migration, it costs nothing to do so.
2. **Editing the `/teams` promises.** Removing Editor, "the page made for them" and duplicating follows from your decision, but it's a public change. **Recommendation:** correct it in T1, as drafted above.
3. **`header.layout` per person, or shared.** Shared would look more uniform, and it could look wrong for someone with no photo. **Recommendation:** per person, and revisit in QA.
4. **A Pro user joining.** **Recommendation:** the two equal buttons above, with no refund and no automatic stop.
5. **Invitation links can't be cancelled.** **Recommendation:** accept it with 7 days and no table. Add `invites_from` only when someone needs it, along with `TEAM_MAX = 100`.
6. **Unpaid teams holding an address.** **Recommendation:** allow it, so people can build before paying, and refuse publishing and invitations.
7. **Team page takedown follows the owner.** **Recommendation:** derive it, and accept that an owner's other page affects it.
8. **Monthly only for Team.** `plans.md` has no yearly price. **Recommendation:** monthly at launch.
9. **Sequence.** **Recommendation:** after M6, as above.
10. **Neon's Organization plugin.** Neon's docs say it's on by default per branch, and `auth.ts` forwards every path under `/api/auth/*`, so people can probably create organization rows that Tondo never reads. I haven't checked the real project, and I won't change it. **Recommendation:** switch it off in the Neon Console when you're ready, for each branch. It's your setting to approve, it isn't blocking, and no milestone depends on it. Restricting the proxy to known paths is the alternative, and it risks breaking a path Neon's client needs.

## What I couldn't verify

- **The migration and SQL.** Written by hand from the code, and not run.
- **Stripe.** I read its proration page and the portal session reference. Detaching a customer's cards on handover, and how past invoices look to a new owner, are from my understanding of the API and need the sandbox pass.
- **M1 to M7.** None of it is built, so this plan depends on what that document describes, and names may change.
- **Neon.** Whether the plugin is on for Tondo, and whether advisory locks behave as expected on Neon's connection in production. They're standard Postgres, and I haven't run them there.
- **Sizes.** Estimates, with no measured input.
