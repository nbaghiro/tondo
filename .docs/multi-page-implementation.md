# Multi-page implementation plan

This plan builds option 2 in [multi-page.md](multi-page.md): every page has its own address.

**Status:** P1 to P5 are built: the migration, the stores, routes and editor by page id, the switcher, the pencil, New page, photos by page, the sitemap, tests and docs. Copy this page came with P3. Swapping two addresses was cut. Sections below that describe the Free draft, read-only pages and Free's prompts were written before the plans changed, so read them with [What changed while building](#what-changed-while-building). Sizes were my estimates for one developer.

**Changed by the simplified plans of 2026-11-01** (see [plans-implementation.md](plans-implementation.md)). These parts of this plan no longer apply: the Free draft and `Limits.drafts`, `isReadOnly` and read-only pages, "Publish with free choices" and "Not now" around a page count, and the downgrade decisions. `Limits` now has `pages` (can build) and `live` (can be online). Free builds 1 page and has none live. A person's live pages count oldest first, and those past the plan's `live` number go offline, stay editable and come back when the number allows, which is derived with no column. Publishing past the number offers a plan instead of a plain issue. Starter builds up to 5 pages with 1 live. Coming back from checkout now carries `page`, so it opens the page being published. P3 to P5 are still to do, and the page switcher will need to show which pages are offline, using `offline` on the draft response or the same ranking.

**There are no users, so there's no backwards compatibility work.** No shims, dual reads, phased column moves, or upgrade paths for accounts or photo folders. Singular routes are removed in the same change that adds the new ones. The migration only keeps local development data.

## What's being built

| | Free | Pro, $6 a month or $60 a year |
|---|---|---|
| Pages | 1 live, plus 1 draft with no address | 5, each with its own address, drafts counted |
| Address | One, claimed at sign-up | One per page, chosen when the page is added |
| Look, draft, publishing, statistics, share link | Per page | Per page |
| Login, bill, photo allowance, Help me credits | Per person | Per person |

Nothing public connects one person's pages, unless they add a link or use the same photo on two of them.

## Decisions this plan takes

| Status | Decision | Taken as |
|---|---|---|
| Owner's choice | Option | Own address per page |
| Owner's choice | Pages on Pro | 5 |
| Owner's choice | Old addresses | Don't redirect, as the Terms say today |
| Owner's choice | Sequence | Replaces M6, and ships before charging |
| Owner's design | Home | Switcher in Edit page's place, pencil beside the phone |
| Working default | All others | As numbered in [multi-page.md](multi-page.md). [Decisions that would change this plan](#decisions-that-would-change-this-plan) lists what each would alter |

## Data

No new table. `teams` isn't in the schema yet, and it's covered under [Teams](#changes-to-teams).

```diff
 export const users = pgTable("users", {
     id: text("id").primaryKey(),
-    handle: text("handle").notNull().unique(),
     suspendedAt: ..., plan: ..., stripeId: ..., endsAt: ...,
 });

 export const pages = pgTable("pages", {
     id: uuid("id").primaryKey().defaultRandom(),
     userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
-    slug: text("slug").notNull().default(""),
+    /** The page's address. Null only on a draft that hasn't been given one. */
+    handle: text("handle").unique(),
     draft: ..., published: ..., updatedAt: ...,
+    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
 }, (table) => [
-    unique("pages_user_slug").on(table.userId, table.slug),
+    index("pages_user").on(table.userId),
+    check("pages_live_has_address", sql`${table.published} is null or ${table.handle} is not null`),
 ]);
```

### Migration

Generate it with `pnpm db:generate`, then add the `update` by hand, since `drizzle-kit` can't infer it. The latest migration is `0004_sour_human_cannonball`, and M4 or M5 may add another, so don't choose a number.

```sql
alter table pages add column handle text unique;
alter table pages add column created_at timestamptz not null default now();
update pages p set handle = u.handle from users u where p.user_id = u.id;
alter table pages add constraint pages_live_has_address
    check (published is null or handle is not null);
alter table pages drop constraint pages_user_slug;
alter table pages drop column slug;
alter table users drop column handle;
create index pages_user on pages (user_id);
```

I read local Docker's Postgres without changing it: 2 `users` rows (`nbaghiro` and `sample`), 2 `pages` rows, none with a non-empty slug and no `removed:` rows. So the `update` carries the owner's draft across with its id, and `stats` follow it. `tests/setup-database.ts` runs migrations, so it needs no change.

### What's derived

| Value | How |
|---|---|
| Whether someone needs the start flow | They have no pages |
| Whether a page is live | `published` is set |
| A page's name and swatch in the switcher | `header.name`, `look` and `seed` in `draft` |
| Read-only after a downgrade | A live page whose rank by `created_at` is at or past `limits.pages` |
| Page shown with no `?page=` | Latest `updated_at` |
| Whether an address is taken | A row in `pages`, decided by the unique constraint |

## Limits

In `packages/page/src/limits.ts`, the only file that knows plans:

- `PAID.pages` changes from 10 to 5. Team reads the same value today, see [Teams](#changes-to-teams).
- `Limits` gains `drafts`: 1 on Free and 0 on paid plans. `plans-implementation.md` proposed this field, and the landed file doesn't have it. `meResponse` in `packages/contract` gains it too.
- Add `canAddPage(limits, total)`, `canPublishPage(limits, live, isLive)` and `isReadOnly(limits, rank, isLive)`. These don't exist yet. `isReadOnly` uses rank, so there's no slug to check.

With `PLANS_ON=false`, `limitsOf` returns Pro's limits, so everyone has 5 pages until charging opens. The pricing page reads `PLANS`, so its number follows. Its copy changes in the [pricing](#pricing-and-copy) step.

| Enforced at | Check | Refusal |
|---|---|---|
| `POST /me/pages` | `canAddPage` | 403, `plan_limit` |
| Publish | `canPublishPage`, as a plan issue in `serverIssues` | 422, in the publish panel's plan group |
| Save | `isReadOnly`. Taking down and deleting stay allowed | 403, `plan_limit` |

"Publish with free choices" can't solve a page count, so the panel leaves that button out when this is the only issue, and offers "Get Pro" and "Not now".

## The store

`packages/db/src/pages.ts`:

| Today | Becomes |
|---|---|
| `MAIN_PAGE`, `mainPageOf(userId)` | `pageOf(userId, pageId)`, the one place that picks a page, always filtering on both |
| `findLive(handle)` joining `users` for the address | Reads `pages.handle`, joining `users` only for suspension and plan |
| `findDraft`, `saveDraft`, `publish`, `unpublish`, `findOwnLive`, `statsFor` by person | Each takes a page id too |
| `handleOf(userId)` | Removed. `publish` and `unpublish` return the page's handle for the cache |
| | New: `listPages(userId)`, `createPage`, `deletePage`, `setHandle`, `swapHandles`, `documentsOf(userId)` |

`packages/db/src/accounts.ts`:

- `findHandle` becomes `hasPage`.
- `handleTaken` reads `pages`.
- `claimHandle` inserts the `users` row and the first page in one transaction, and the unique constraint decides races.
- `changeHandle` moves to the page store as `setHandle(userId, pageId, handle)`. It catches only Postgres's unique violation (23505), which also fixes the `.catch(() => [])` that today reports every failure as "taken".
- `setPlan`, arriving in M5, returns all of a person's handles.

**Deleting a page.** `deletePage` refuses the person's last page. Statistics go through the cascade, and the address is free at once.

**Swapping two addresses.** In one transaction, move the first page to a temporary value such as `swap-<uuid>`, which can't be requested because it's over the length limit, then give the second page the first's address, and the first page the second's. A null wouldn't work, because a live page must have an address. This can be cut from the first version.

`apps/server/src/fake-store.ts` matches all of this, and its `owners` map moves from per person to per page.

## Routes

Public routes keep their shape: `GET /:handle` and `GET /l/:handle/:target`, the cache key, `trackAs`, the report link and `shareUrl`. There's no slug validation, no second reserved list and no two-part route.

In `packages/contract/src/index.ts`, the singular routes go:

| Route | Does | Errors |
|---|---|---|
| `POST /api/v1/me/handle` | Claims the first address and page, as today | 409 taken, 400 reserved |
| `GET /api/v1/me/pages` | Lists pages. `/me` carries the same list | |
| `POST /api/v1/me/pages` `{ name, handle?, from? }` | Adds a page. `handle` is required on a paid plan and left out of a free draft. `from` is a page id to copy | 403 `plan_limit`, 409 taken |
| `GET`, `PUT`, `DELETE /api/v1/me/pages/:id` | Draft, save, delete | 404 not theirs, 409 conflict or last page |
| `PATCH /api/v1/me/pages/:id/handle` | Changes the address, using `allowChange` | 409 taken, 403 suspended |
| `POST /api/v1/me/pages/:id/publish` `{ updatedAt, free?, handle? }` | Publishes. `handle` gives a draft its address in the same statement | 422 issues, 409 |
| `GET .../:id/check`, `GET .../:id/live`, `POST .../:id/unpublish`, `GET .../:id/stats` | As today, per page | 404 |
| `GET /api/v1/handles/:handle` | Unchanged | |

- A page that isn't the person's answers 404, tested in a table across every route in `apps/server/src/pages.test.ts`.
- The comment at the top of `mountPages` saying no request names a page is rewritten.
- `meResponse.handle` becomes `pages: { id, handle, name, look, seed, live, changed }[]`. `main.tsx` sends someone with no pages to the start flow, and `auth.ts` line 406 uses `hasPage`.
- The rate limits stay per person.
- `apps/server/src/sitemap.ts` serves `GET /sitemap.xml` before `mountSite`, with every live page of non-suspended accounts, cached for an hour, plus `apps/marketing/public/robots.txt`. This carries over from M6.

## Stats, publishing and the cache

- **Statistics:** `stats` doesn't change. `AnalyticsPage.tsx` and Home's numbers follow the chosen page, and a combined total waits.
- **Publishing:** per document, so `paidUses` and `stepDown` from M2 and M4 need only the page id. `findOwnLive` becomes the page's own live copy, which is what `paidUses` compares against.
- **Cache:** keyed by handle, as today. Publishing drops the one key. A plan change, suspension or account deletion drops each of the person's keys, so `onHandleChange(before, after)` and `onPublishChange` take handles.

## Deletion and suspension

**Account deletion.** `DELETE /me` removes photos first, as today, then `removeUser`, and the cascade takes pages and statistics. The confirmation lists every address and asks for the person's email, because `deleteAccountRequest { handle }` no longer has one obvious value, and a person could have only a draft with no address.

**Suspension.** `users.suspended_at` stays the only level, so all of a person's pages go. `suspend.ts <address>` and `comp.ts <address>` find the owner through `pages.handle`. Allow 15 seconds for the cache, as today.

**Deleting while suspended.** `removeUser` keeps addresses out of use by inserting a `removed:<id>` user with one unpublished page per address. `pages.draft` is required, so each holds a blank document. This replaces today's single row, and `findLive` returns nothing because `published` is null.

## Photos

Each page has its own folder, so image addresses don't connect pages. This is simply how photos work, with no moving of old files.

- `storePhoto` and `folderFor` take a page id. `routes.photos` and the photo routes in `assistant.ts` (lines 239 and 252 today) take `?page=<id>`, checked with `pageOf`.
- **Before the first page exists,** the upload routes only need a login, and `usage`'s comment says Help me runs in the start flow, so uploads can arrive with no page id. Those stay in `folderFor(person.id)`, and only the first page can refer to them. The owner's existing local photos are already there, so they keep working.
- **Allowance and picker:** both list the person's folder plus each page's folder. That's at most 6 listings, and `apps/server/src/photos.ts` does this in one helper, `listPhotos(userId)`.
- **Removing a photo:** refused if any of the person's drafts or live copies uses it, through `documentsOf(userId)`.
- **Account deletion:** `removeFiles` needs page ids, so it lists them before anything is deleted.
- **Known limit:** choosing another page's photo in the picker keeps its path, so those two pages share a folder in their source. They already share a visible photo, so I'd accept this.

## Home and the sidebar

Mocks: http://localhost:8107/.scratchpad/multipage/options.html#o2

| File | Change |
|---|---|
| `apps/editor/src/app/router.ts`, `lib/account.ts` | The chosen page is `?page=<id>`, with a helper that adds it to app paths. `nav.ts` doesn't change |
| `apps/editor/src/components/PageSwitcher.tsx` | New. A 38 px bordered button with swatch and name, opening a menu of pages with address and status, and "New page" with a count at the end |
| `Shell.tsx` | `PageSwitcher` replaces `<a class="edit">`. On a phone it replaces `.bar-address`. `.bottom` keeps Edit page |
| `HomePage.tsx` | A pencil link beside the phone in `.pv`, outside `Phone`, with `aria-label` and `title` of Edit page, hidden at 760 px and below. The greeting uses `account.name`. All calls take the page id |
| `shell.css` | `.pen` in the 72 px gap. `.side-top` loses `.edit` |
| `AnalyticsPage.tsx`, `SettingsPage.tsx` | An Edit page button in each header, since neither has a phone. Both follow the chosen page |
| `AccountPage.tsx` | Doesn't follow the page. Deletion lists addresses |
| `NewPageModal.tsx` | New. Name, address with the existing check, and start from a look or a copy. Free's prompt uses the same modal |
| `SettingsPage.tsx` | This page's address, Change address, Copy this page, Delete this page |
| `lib/api.ts` | Every call takes the page id |

**Copy, sentence case and no em dashes:**

| Moment | Words |
|---|---|
| New page on Free | A second page can go live with Pro, for $6 a month, and gets its own address. You can build it now and choose the address when you publish. If you only need a few more sections on your page, you don't need this. Buttons: Build it, See Pro |
| New page with a draft on Free | You have a draft page already. Remove it to start another, or get Pro for 5 pages. |
| New page at 5 on Pro | You're using all 5 pages. Delete one to add another. |
| Read-only after a downgrade | This page stays live and can't be edited on Free. Get Pro to edit it, or take it down. |
| Taking down a read-only page | This frees tondo.page/the-low-notes, and someone else can claim it. Taking it live again needs Pro and a new address if it's gone. |
| Changing an address | The old address stops working at once and someone else can claim it. Links and QR codes using it will stop working. |

Taking down a read-only page sets `handle` to null, in `unpublish`, so it can't hold a name for free.

## The builder

| File | Change |
|---|---|
| `apps/editor/src/app/builder.tsx`, `Editor.tsx` | Loads `?page=`. `props.account.handle` becomes the chosen page's, at lines 110, 125, 160, 161, 457 and 536 today |
| `TopBar.tsx` | The address opens the same menu. A draft with no address says "No address yet". `saver().flush()` runs before switching |
| `state/storage.ts` | Backups keyed by page id. Old keys are ignored, so anything unsaved in the owner's local browser under the old key won't be offered back |
| `state/document.ts`, `state/saver.ts` | Take the page id. Undo resets on switching |
| `PublishPanel.tsx` | Shows the address being published to, and asks for one on a draft without it, using the same check |
| `HelpPanel.tsx`, `assistant.ts` | Photos by page. Credits stay per person |
| `apps/editor/src/app/labs.tsx`, `PlanLab.tsx` | Fixtures gain a page list, plus switcher and limit states |

Links between pages stay as plain addresses. M6's optional `page` reference is left out, since a changed address breaks a pasted link as it would on any other site. It can come later.

## Pricing and copy

These change in M7 at the latest:

- `apps/marketing/src/pages/pricing.astro` and `data/plans.ts`: 5 pages, each with its own address, on Pro.
- `components/Pricing.astro`: "One page and one address" stays right for Free.
- `pages/terms.astro`: "Changing or giving one up" says "your account" and applies per page. Add that taking down an extra page after a plan ends frees its address.
- `AGENTS.md`, `about.astro` and the hero say one address for a person or team, which can stay for now and is the owner's call.

## Docs to update when built

| Doc | Change |
|---|---|
| `features.md` | Decision 1 becomes "a page has an address". The Sub-pages row moves out of phase 4. "Many profiles under one account" is done for people. "Link directly to a tab" keeps `/maya/shop` |
| `data-model.md`, `how-it-works.md` | Tables, and the "one address per person" trade-off |
| `qa.md`, `roadmap.md` | New checks and status |
| `plans.md` | Its "Pages per person" section and gating rows, with a note that this replaces them |

## Tests

**Unit, in `pnpm check`:**

- `limits.test.ts`: the new functions and numbers.
- `pages.test.ts`: someone else's page id gives 404 on every route, the last page can't be deleted, 6th page and second free draft are refused.
- `apps/server/src/photos.test.ts`: folders by page, allowance across folders, removal refused across pages.
- A Postgres test in the style of the existing database tests: the unique constraint, and a live page with no address failing the check.
- `app.test.ts`: address change, plan change and suspension drop the right keys.

**End to end, `tests/multipage.spec.ts`, both viewports:**

1. Add a second page, publish it, visit it and count a click, and see separate statistics.
2. Two pages keep separate backups, across two tabs.
3. Switcher in the sidebar and on a phone, and Analytics and Page settings following it.
4. Pencil's name and position, outside the phone, and absent on a phone.
5. Free's prompt, draft with no address, and publish needing Pro.
6. Read-only after a downgrade, and taking down freeing the address.
7. Changing one address leaves the other working.
8. Delete a page, delete the account, and suspended addresses staying taken.
9. Image addresses on two pages have different folders.
10. No `<script` on a second page, and the sitemap lists live pages only.

**Existing tests that change:** `tests/home.spec.ts` line 231 expects `.side .edit`. `tests/helpers.ts` line 13 sets a plan `where handle = ...`. `apps/server/src/pages.test.ts` and any test calling singular routes move to ids. `grep` finds "handle" in 11 files under `tests`, some unrelated.

## Milestones

Each ships alone and passes `pnpm check` and `pnpm e2e`. Sizes are estimates. Start after M5 lands, because P1 and P2 rework `pages.ts`, `accounts.ts`, `auth.ts`, `limits.ts` and `Editor.tsx`, which M4 and M5 are changing.

| # | Milestone | Main files | Size | Ships as |
|---|---|---|---|---|
| P1 | Migration, stores, fake store, `suspend.ts`, `comp.ts`, tombstones. `/me` and claim. All routes by id, with limits | `schema.ts`, `db/*`, `contract`, `auth.ts`, `pages.ts`, `limits.ts` | 4 to 5 days | Not separately: the editor has to move with it, so P1 and P2 land together |
| P2 | Editor by page id: `api.ts`, `storage.ts`, `router.ts`, `Editor.tsx`, Home, Analytics, Settings, with one page still all you can reach | Editor files | 3 to 4 days | With P1. No visible change for one page |
| P3 | Switcher, pencil, header buttons, new page modal, top bar, Free prompt, read-only states, labs | `Shell.tsx`, `PageSwitcher.tsx`, `HomePage.tsx`, `TopBar.tsx`, `PublishPanel.tsx` | 3 to 4 days | Visible, up to 5 pages for everyone while `PLANS_ON` is off |
| P4 | Photos by page | `photos.ts`, `assistant.ts`, picker | 1 to 2 days | Visible |
| P5 | Sitemap, `multipage.spec.ts`, docs, QA list, Copy this page, swap if time allows | `sitemap.ts`, tests, docs | 2 to 3 days | Visible |

That comes to about 13 to 18 days, so about 3 weeks, at the low end of the 3 to 4 in [multi-page.md](multi-page.md) because no compatibility work is needed. M6 was 2 to 3 weeks, so charging moves from about 7 weeks to about 8, counted from the start of M0.

```
M4, M5 ── P1 + P2 ── P3 ──┬── P5 ── M7
                     P4 ──┘
```

One agent should take P1 and P2, since they can't land apart. P3 and P4 can run side by side, and they share only `api.ts`.

## How this replaces M6

| M6 item | Here |
|---|---|
| `isValidSlug`, slug reserved list | Dropped |
| `GET /:handle/:slug`, `/l/:handle/:slug/:target`, two-segment redirect, `dropAll(prefix)`, `trackAs` with a slug | Dropped |
| `pageOf`, routes by id, `listPages`, `createPage`, `deletePage` | Kept, with `setHandle` for rename |
| Switcher | Kept, in the owner's position, with the pencil |
| `PagesList.tsx` | Dropped, since 5 pages fit in the menu |
| Backups by page id, Analytics and Settings following the page, sitemap | Kept |
| Copying the main page's look | Replaced by a choice of look or a copy |
| Checklist item suggesting a link from the main page | Dropped, since each page is shared by its own address |
| `page` reference on links | Left out |
| `tests/subpages.spec.ts` | Replaced by `tests/multipage.spec.ts` |

## Changes needed in `plans-implementation.md`

I haven't edited this file, as the plans agent is working in it.

| Where | Change |
|---|---|
| Status line | M6 points here |
| "What's being built" | Pro: 5, each with its own address. Team per the section below |
| Decision 5 | Pro launches with own addresses, not sub-pages |
| "Data" | Sub-pages sentence goes. Note the later migration |
| `Limits` | `pages: 5`, and add `drafts` |
| "Every enforcement point", lines 189 to 191 | Name own pages |
| Copy, lines 257, 258 and 265 | As in this plan's copy table |
| "Downgrades" | Extra pages row, plus taking down frees the address |
| "Pricing page", lines 442 and 454 | 1 and 5 pages |
| "Multi-page" section, lines 475 onward | Replace with a pointer here |
| M6 row, order for agents, risks line 686 | M6 is P1 to P5. Remove "sub-pages have phishing slugs reserved" |

**M7** changes only in its copy: Terms gain the address rule, the "up to 10 pages" label becomes 5, and `comp --all` finds owners through `pages`. Its size doesn't change.

**M4 and M5, now in progress:** nothing needs to stop. `setPlan` returning one handle, `findLive`'s join, and anything keyed to `users.handle` get reworked in P1. If it's cheap, M5's `setPlan` could return the user id, and P1 then looks up handles.

## Changes to teams

I haven't edited `teams-implementation.md`. These are the changes it would need, for the owner to confirm.

| Milestone | Change | Effect on size |
|---|---|---|
| T1 | No `teams.handle`, `handles.ts`, advisory lock or cross-table check, because `pages.handle` covers every address. `pages_team_slug` goes. Keeps `users.team_id`, nullable `pages.user_id`, `pages.team_id`, `team` reserved and `/teams` copy | 2 to 3 days becomes about 1 |
| T2 | Page routes, photos and backups by id already exist. Adds the `editableBy` clause to `pageOf` | 2 to 3 days becomes under 1 |
| T3 | `createTeam` inserts a team and a page with an address. `PATCH /me/team` for the address goes, using the page route. Joining asks which page joins, defaulting to the oldest. A member's page holds `team_id` with `user_id` kept, so `pages_one_owner` becomes at least one set, and `editableBy` treats a row with `user_id` as the person's. `deleteTeam` clears members' rows first, because `pages.team_id` cascades | About the same |
| T4 | The team look merges onto pages with `team_id` set, and not on all of a member's pages. `findLive` reads that column. The team's look comes from its oldest page | About the same |
| T5 | The switcher lists the person's pages and then the team's. No new Team page change | Slightly less |
| T6 | Team totals sum over `pages.team_id` | Same |
| T7 | `Limits` for a team's own side, per decision 10 | Same |
| T8 | 1 team page until now, then 5. Sharing the look across team pages uses the oldest page, which needs protecting from deletion | 2 to 3 days becomes about 1 |
| T9 | `/teams` and pricing copy say this number | Same |

The sequence stays as it is: teams after this work. T1 to T9 fall by roughly 3 to 5 days.

**Team's numbers need the owner.** `PLANS.team` shares `PAID`, so a member gets 5 pages. `plans.md`'s "10 a person, plus 25" stops applying.

## What changed while building

Where the code or a later decision differed from the plan above, this is what was done in P1 and P2.

- **`pages.handle` is required, and there's no `pages_live_has_address` check.** The null value only existed for the Free draft, which isn't being built, and this plan's decision 4 says both go without it. If new plans need a page with no address, it's one migration.
- **Not built, on the owner's new plans:** `Limits.drafts`, `isReadOnly`, taking down a read-only page freeing its address, Free's prompts, and `handle` on the publish request. Limits are unchanged in number, and page rules are only in `canAddPage` and `canPublishPage` in `limits.ts`, so new numbers change there.
- **A page over the live limit gets a plain publish issue,** without the plan group, Get Pro or any price, until the new plans settle what to offer.
- **The migration was written from two generated steps.** `drizzle-kit generate` asks whether `handle` is a rename of `slug`, and needs a terminal to answer. I generated it in two steps, merged them into `0005_one_address_per_page`, and ordered the statements by hand so the addresses are copied before `users.handle` goes. It doesn't carry `removed:` rows, since neither the local database nor the test database has any.
- **`hasPage` and `isSuspended` aren't in `AccountStore`.** `listPages` answers the first, and the page routes read suspension from the draft.
- **`publish` and `unpublish` don't return the handle,** because the route has already read the draft. `publish` still returns a boolean, since it can't change an address.
- **`/me` also returns each page's `updatedAt`,** which choosing the page edited last needs.
- **`POST /me/pages` also takes `look`,** for "start from a look".
- **`PATCH` returns `{ handle }`,** not the whole account.
- **Deleting a page is refused while suspended,** or it would free an address that's meant to stay out of use.
- **The sidebar's Edit page stays until P3.** Links inside the app now carry `?page=<id>`.
- **Coming back from checkout has no page id,** so it opens the page edited last. I left `billing.ts` alone, as Stripe work is out of scope here. It needs the id once people can reach several pages.
- **Photos are still in one folder per person,** which is P4. Removing a photo already checks every page's draft and live copy.
- **Swapping two addresses wasn't built.** Nothing in the interface would use it yet.

In P3:

- **The phone's builder bar shows no address.** There was room for about one letter of it, so the switcher sits beside Home and its menu lists addresses.
- **New page from the builder saves, then opens the dialog on Home,** so the dialog's form styles load in only one bundle.
- **The look choice is a plain list.** The builder's look tiles belong to the builder's bundle, and a look can be changed straight after.
- **A person's list is read again each time the menu opens,** so a page published in another tab shows its status.
- **Left out:** the line on Home naming other pages that need attention, and the switcher in `labs.tsx`, since the plan lab has been removed. Neither is in a milestone's main files.
- **Offline pages** show as Offline in the menu, ranked in the browser with the same `isOnline` the server uses.

In P4:

- **Deleting a page clears its folder.** The plan didn't say what happens to it. Nothing could find that folder once its page has gone, so photos another page still uses are copied to the person's own folder and that page's documents are rewritten to match, in `clearPageFolder`. If storage can't be reached, the page stays and the person is asked to try again.
- **Only a person's own folders are ever listed, removed or counted.** Listing paths found in documents would let someone write another person's photo path into a page and have it deleted with their account.
- **Removing a photo sends its full path,** since the same photo can sit in two folders.
- **`documentsOf` and `movePhotos` are new in the page store.** Moving moves `updated_at`, so a tab still holding old paths gets the usual conflict.

In P5:

- **`listPublished` is new in the page store,** so the sitemap uses the same rank and `isOnline` as the public route. An ended plan or a page past the live number stays out.
- **`robots.txt` names `tondo.page`,** because it's a static file in the marketing site. It also keeps `/app` and `/api` out of search.
- **Marketing pages aren't in the sitemap.** It lists live pages only, as planned.
- **Pricing and Terms weren't changed here,** since the plans work already rewrote pricing and Terms are out of scope. The Terms' line about changing an address still says "your account", and it needs the owner before charging.

After P5:

- **New page now uses the start flow, and `NewPageModal.tsx` is gone.** The owner asked for the same full-screen steps a new sign-up gets. Pressing New page opens `/app/start?page=<id>&back=<screen>` with the same `StartFlow` component. This replaces the P3 notes above about the dialog and the plain list of looks.
- **`page` and `back` say the visit came from New page.** They name the page and screen Cancel returns to, and `back` only accepts the app's own screens. A person with pages who opens `/app/start` without a page of theirs in the address goes to Home, as before.
- **Nothing is created until the last step.** Finishing sends `POST /me/pages` with the page the flow built, then replaces the flow in the browser's history, so Back from the builder doesn't return to it. Reloading restarts the flow at its first step, as it does for a first page.
- **`POST /me/pages` takes `page`, or `name` with an optional `from`.** `look` is removed, since only the dialog sent it. A request with just `name` still makes a blank page, which the API and its tests use and the interface doesn't.
- **The limit prompt stays a small dialog, in `PageLimitPrompt.tsx`.** The browser checks the limit when New page is pressed and when `/app/start` opens, and goes to Home with `?limit=1` to show the prompt. If the limit is reached during the flow, the server refuses and the address step shows its message.
- **Copy this page is now a small form inside its Page settings section,** in `CopyPageForm.tsx`, because it relied on the dialog. It asks for a name and an address, and shows the limit prompt at the limit.

## Decisions that would change this plan

These stay working defaults, numbered as in [multi-page.md](multi-page.md).

| # | Default | If it changes |
|---|---|---|
| 2 | One login, bill and photo allowance | Per-page bills would need `plan` on `pages`, which is a large change to M5 |
| 4 | One free draft with no address | Without it, `drafts`, the null `handle` and the check on live pages can go, and P3 shrinks by about a day |
| 5 | Oldest page stays editable | Letting a person choose adds `users.kept_page_id` and a small screen |
| 6 | Taking down frees the address | Holding it adds a date column, and the reclaim rule is separate work waiting on email |
| 7 | Suspend the person | Per page adds `pages.suspended_at`, and changes `findLive`, `findDraft`, `suspend.ts` and tombstones, about 1 day |
| 8 | Folders per page | Keeping one folder removes P4, and image addresses then connect pages |
| 9 | One member page joins a team | Teams only |
| 10 | 1, then 5 team pages | Teams only |
| 11 | `/maya/shop` for tab links | Separate work, about 2 to 3 days, not in this plan. If sub-pages are wanted instead, it's a later addition of `parent_id` and `slug` |
| 14 | Choice of look or a copy | Inheriting a look removes a step from `NewPageModal.tsx` |

## Risks

| Risk | What it means | Mitigation |
|---|---|---|
| Conflicts with M4 and M5 | Same files | Start after M5, and re-read before P1 |
| A missed page filter | A person could reach another's page | One `pageOf`, a table test across all routes |
| Pencil is easy to miss | It's the main action for a new person, with no word beside it. Untested | Watch it in QA. It can gain a label on a first visit |
| Holding names | 5 at $6, kept after a downgrade while live | Limit of 5, and freeing on take-down. Reclaim rule waits for email |
| Agencies on Pro | $6 against at least $12 on Team | Accepted for now |

## What I couldn't verify

- **Whether Help me uploads before the first page exists in practice.** I read that from the route and `usage`'s comment, and the plan holds either way.
- **Line numbers,** which will move as M4 and M5 land.
- **Sizes,** which are estimates.
