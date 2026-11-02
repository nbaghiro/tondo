# Schema options for teams

**Decided on 2026-11-01: option E, one `teams` table.** The build plan is in [teams-implementation.md](teams-implementation.md), and that's where the current shape is. Two later decisions changed the diff below: each page now has its own address, so `teams.handle` is gone, and team features are part of flat Pro, so `plan` and `stripe_id` are gone from `teams`. `users.team_id` went too, because a person's team can be derived from their joined page. Options A to D and the recommendation for C are kept as history of how this was weighed, and they don't describe what's being built.

## Option E: one `teams` table (the decision)

The owner chose this over the earlier recommendation of C. It adds one table, and keeps people and teams apart.

```diff
+export const teams = pgTable("teams", {
+    id: uuid("id").primaryKey().defaultRandom(),
+    handle: text("handle").notNull().unique(),
+    ownerId: text("owner_id").notNull().unique().references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
+    plan: text("plan"),
+    stripeId: text("stripe_id"),
+});

 export const users = pgTable("users", {
     ...
+    teamId: uuid("team_id").references((): AnyPgColumn => teams.id, { onDelete: "set null" }),
 });

 export const pages = pgTable("pages", {
-    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
+    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
+    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
     ...
 }, (table) => [
     unique("pages_user_slug").on(table.userId, table.slug),
+    unique("pages_team_slug").on(table.teamId, table.slug),
+    check("pages_one_owner", sql`num_nonnulls(${table.userId}, ${table.teamId}) = 1`),
 ]);
```

**Resulting tables:** `users` (id, handle, suspended_at, team_id), `teams` (id, handle, owner_id, plan, stripe_id), `pages` (id, user_id, team_id, slug, draft, published, updated_at), `stats` and `usage` (unchanged). That's 5 in all. The counts in the rest of this document predate `usage`, so each is one lower than it would be today. The implementation plan proposes adding `plan` and `stripe_id` when billing arrives, along with `ends_at`, for the owner to confirm.

- **No `members` table and no roles column.** The owner is `teams.owner_id`, and everyone else with that `team_id` is a member.
- **Invitations are signed links that expire,** with no table and no pending rows.
- **No Neon organizations.**
- **One team per person.** Members keep their own `users.handle` and pages, and leaving keeps them.
- **The team's page lives at `teams.handle`.**
- **The shared look is the team page's look,** merged when read, with nothing stored. The section on the shared look below still applies, with the details corrected in the plan.
- **Seats are counted from `users`.**
- **Addresses are checked across both tables** in a transaction, with a lock, because no constraint can span them.

**What it accepts from option A's list of costs:** an address has two homes, a page has two possible owners, and future tables that need a team face the same choice. What it avoids is `members`, the placeholder rows that A and C both needed for pending people, and renaming a primary key. A person can have a personal page and be on a team, which C couldn't offer as a team page and a personal page under one login.

**What it gives up:** pages made for someone before they join, an Editor role, and running several teams. `/teams` currently promises the first two, and the plan drafts the change.

The rest of this file is the proposal as it was written.

## How this was proposed

This was a proposal, written on 2026-11-01. The diagrams and a comparison table are at http://localhost:8107/.scratchpad/teams-schema/index.html.

Sizes are my rough estimates for one developer and haven't been tested against real work. I read Neon's public docs and the `@neon/auth` package, and I didn't query a real Neon database.

## Earlier recommendation, not taken

Use option C: a team is a row in `users`, with `team_id` and `role` added to that same table. It adds no tables, keeps `users.handle` as the one list of addresses, and leaves `findLive` and every `pages` constraint nearly as they are.

The shared look needs no storage either. It's the look on the team's own page, applied to each member's page when that page is read.

C has one real limit: a person belongs to at most one team, and has one address. If you want someone to run several teams, or keep a personal page and a team page under one login, C stops being enough. Adding a `members` table covers the first case in a small migration. The second needs option B. That's the first question at the end, and the answer could change this recommendation.

## The options at a glance

Table counts are Tondo's own tables, including `stats`. Today's count is 3.

| Option | Idea | Tables | Size of the schema, store and server work |
|---|---|---|---|
| A | New `teams` and `members` tables, with `pages.team_id` | 5 | 2 to 3 weeks |
| B | `handles` replaces `users` and owns pages, and `members` says who can edit | 4 | 4 to 5 weeks |
| C | A team is a `users` row, and people point at it with `team_id` | 3 (4 with `members`) | 1.5 to 2 weeks |
| D | Neon Auth organizations hold membership and invitations, with a `users` row for the team's address | 3, plus 3 managed by Neon | 2 to 3 weeks |

Each option also needs about 2 to 3 weeks for the team screen, invitation flow and billing, which don't differ much between them. Stripe isn't integrated yet, so that work is included in this figure only as seat counting, and setting up paid plans is separate.

## What stays the same in every option

**Who gets asked "may I edit this?" is new everywhere.** `apps/server/src/pages.ts` says that no request names a page or a user, so nobody can ask for someone else's page. An owner editing a member's page ends that guarantee. In every option the page routes gain an optional target and go through one permission check, and that check needs thorough tests. `mainPageOf(userId)` in `packages/db/src/pages.ts` stays the one place that picks a page.

**Pages made before their person joins.** The Teams page lists "Invitation links, so people can sign in to the page made for them" as coming. Today a page needs a `users` row, and a `users` row needs a Neon Auth id, so there's nowhere to put an address for someone who hasn't signed up. This is where the options differ most.

**Stats don't change.** `stats` hangs off `pages.id`, so all four options keep it as it is. A team total is a sum over the team's pages.

**Neon's organization routes are reachable today.** Neon's docs say the Organization plugin is on by default for each branch, and `apps/server/src/auth.ts` forwards every path under `/api/auth/*`. So a signed-in person can probably call `organization/create` now. I read this from the code and docs and didn't test it. Nothing in Tondo reads those tables, so the harm is limited to stray rows, but under A, B or C the plugin should be switched off in the Neon Console, and the proxy could allow only the paths Tondo uses.

## How the shared look is stored

This applies to all four options, so it's settled here once.

| | Merged when read, from the team's page (proposed) | A look document on the team, merged when read | Copied into each page at publish |
|---|---|---|---|
| New storage | None. It reads `look` and `style` from the team page's `published` | One `look` JSONB column | None, but the same look is stored N times |
| Draft and publish | The team page's own draft and publish, already built | Needs a second column, or changes go live on save | As the first column, plus a write to every page |
| A member can't change it | Holds automatically, because the render ignores their value | Same | Needs checking at save and at publish |
| Effect on a member's open editor | None | None | Writing to a draft moves `updated_at`, so an open tab gets a false "changed somewhere else" |
| Member publishes later | Keeps the team look | Keeps the team look | Must copy again, or the old look returns |
| Leaving a team | Their own earlier look comes back, with no writes | Same | Keeps the team look, with no writes |
| Rendering cost | One extra read on a cache miss | One extra read | None |

The merge is one pure function in `packages/page`, roughly `{ ...page, look: team.look, style: team.style }`. `seed` stays on each page, so each person's picture still differs. `header.wordmark` also stays per page, because it draws each person's name.

Three details matter when this is built:

- **The editor needs the team's look separately.** If `findDraft` returned a merged page, the next autosave would write the team's look into the member's document. It should return the member's document plus `teamLook`, and apply it only to the preview.
- **The cache takes up to 15 seconds.** `PAGE_CACHE_MS` in `apps/server/src/app.ts` is 15 seconds, and the cache is keyed by handle. Publishing the team page should drop every member's key, or the owner can wait out those 15 seconds on the other pages.
- **Two docs disagree.** `how-it-works.md` says a change reaches pages "on the next publish". The Teams page says "reaches every page when it changes". This proposal means the team page's publish changes every page at once, which satisfies both if "the next publish" means the owner's.

If the team page isn't published, there's no team look yet and members show their own.

## Invitations with no table

A signed link can stand in for an `invitations` table, but a signature alone has two weaknesses: you can't list pending invitations, and you can't cancel one before it expires. A forwarded link would also let anyone join and use up a paid seat.

Tying each link to a pending row fixes all of that. The owner creates the person's page first, which creates a row with its address, and the link carries that row's id, an expiry and a signature:

- **Listing pending invitations** is reading the pending rows.
- **Cancelling** is deleting the row, which makes the link useless.
- **Single use** comes from the row no longer being pending once someone accepts it.

Someone who already has a Tondo page chooses at acceptance, and the simplest rule is that their existing page joins the team and the pending row is deleted. No email service is needed, because the owner copies the link. Neon's mail only covers Neon's own flows. A, B and C can all do this. D uses Neon's own `invitation` table instead.

The link would use a new secret in the environment, with signing in one file, `apps/server/src/invites.ts`.

## Option A: `teams` and `members`

The conventional design, and the easiest to read. It's also the one the current docs come closest to describing, apart from where the address goes.

```diff
+export const teams = pgTable("teams", {
+    id: uuid("id").primaryKey().defaultRandom(),
+    handle: text("handle").notNull().unique(),
+    edits: text("edits").$type<"links" | "page">().notNull().default("page"),
+    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
+});
+
+export const members = pgTable(
+    "members",
+    {
+        teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
+        userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
+        role: text("role").$type<"owner" | "editor" | "member">().notNull(),
+    },
+    (table) => [primaryKey({ columns: [table.teamId, table.userId] }), index("members_user").on(table.userId)],
+);

 export const pages = pgTable("pages", {
-    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
+    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
+    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
     ...
 }, (table) => [
     unique("pages_user_slug").on(table.userId, table.slug),
+    uniqueIndex("pages_team_slug").on(table.teamId, table.slug).where(sql`team_id is not null`),
+    check("pages_one_owner", sql`(user_id is null) <> (team_id is null)`),
 ]);
```

**Resulting tables:** `users` (id, handle, suspended_at), `teams` (id, handle, edits, suspended_at), `members` (team_id, user_id, role), `pages` (id, user_id, team_id, slug, draft, published, updated_at), `stats` (unchanged).

`pages.team_id` is set only on the team's own page. A member's page is found through `members`, because setting it there as well would store something derivable.

**Migration.** Purely additive, and no existing row changes. `pages.user_id` loses its `not null`.

**Queries.**

- *May this person edit this page?* Own page, or a `members` row with owner or editor on the page's team. The page's team comes from either `pages.team_id` or the page owner's `members` row, so there are two paths.
- *Live page for a handle.* `users.handle` first, then `teams.handle`, or a `union`. The look needs a further join through `members` to the team's page.
- *A team's pages.* The team's page, plus `members` joined to `users` and `pages`.
- *Apply the look.* Publish the team's page, then drop each member's cache key.

**Roles.** A column, with three values.

**Invitations.** A signed link with a pending row. The pending row needs an address, and addresses live on `users`, so A needs placeholder `users` rows with made-up ids. That's C's trick, added on top of two extra tables.

**Billing.** `teams.plan` and `teams.stripe_id` for teams, and `users.plan` and `users.stripe_id` for people. `limitsFor` has to look in both. Seats are the count of `members`. [plans.md](plans.md) sets Free, Pro at $6 a month and Team at $4 a person from 3 people, and `pricing.astro` shows those prices as placeholders. Pro and Team would live in different tables.

**Leaving.** Deleting the `members` row. The person keeps their page and address. If the team should keep them, it needs the placeholder swap described under C.

**Account deletion.** `removeUser` deletes the row, and foreign keys clear `members` and pages. It has to refuse or hand over if this person is the last owner. The `removed:<handle>` tombstone needs a matching path for suspended teams.

**Multi-page later.** Works, with slugs unique separately for people and teams.

**What gets harder.**

- **An address has two homes, and nothing in the database prevents a clash.** `juneaster` could be taken in both `users` and `teams`. A unique constraint can't span two tables, so it needs a trigger or a shared lock in code. `handleTaken`, `claimHandle`, `changeHandle`, `findLive` and `suspend.ts` would all check both.
- **A page has two possible owners,** so every query on `pages` deals with a null.
- **`members` allows something a page can't honour.** It lets a person join two teams, but their one page can only take one look. So it needs a rule, or a unique constraint on `user_id`, which removes the main reason to have the table.
- **Future tables face the same choice.** `contacts` and `connections` are planned with `user_id`, and a team page would need them too.

**Where code lives.** `packages/db/src/teams.ts`, `apps/server/src/teams.ts`, `apps/server/src/invites.ts`, and the look merge in `packages/page/src/team-look.ts`. Changes to `accounts.ts`, `pages.ts`, `limits.ts`, `suspend.ts`.

## Option B: `handles` owns pages

An address becomes the main thing, and people get access to addresses. It's the cleanest model and the widest change. `data-model.md` and `features.md` both anticipate moving the address into its own table, though this version goes further by removing `users`.

```diff
-export const users = pgTable("users", {
-    id: text("id").primaryKey(),
-    handle: text("handle").notNull().unique(),
-    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
-});
+export const handles = pgTable("handles", {
+    id: text("id").primaryKey(),
+    handle: text("handle").notNull().unique(),
+    teamId: text("team_id").references((): AnyPgColumn => handles.id, { onDelete: "set null" }),
+    edits: text("edits").$type<"links" | "page">(),
+    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
+}, (table) => [index("handles_team").on(table.teamId)]);
+
+export const members = pgTable("members", {
+    handleId: text("handle_id").notNull().references(() => handles.id, { onDelete: "cascade" }),
+    userId: text("user_id").notNull(),
+    role: text("role").$type<"owner" | "editor">().notNull(),
+}, (table) => [primaryKey({ columns: [table.handleId, table.userId] }), index("members_user").on(table.userId)]);

 export const pages = pgTable("pages", {
-    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
+    handleId: text("handle_id").notNull().references(() => handles.id, { onDelete: "cascade" }),
     ...
-}, (table) => [unique("pages_user_slug").on(table.userId, table.slug)]);
+}, (table) => [unique("pages_handle_slug").on(table.handleId, table.slug)]);
```

**Resulting tables:** `handles` (id, handle, team_id, edits, suspended_at), `members` (handle_id, user_id, role), `pages` (id, handle_id, slug, draft, published, updated_at), `stats` (unchanged).

A team is a handle that other handles point to with `team_id`. `members` says who can edit what, and a person's own page is just a `members` row on their handle. Membership of a team is the child handle, so `members` only needs rows for owners and editors at team level.

**Migration.** Copy each `users` row to `handles`, keeping the old Neon id as `handles.id`. That keeps photo folders working, because `folderFor` hashes the id. Rename `pages.user_id` to `handle_id` with the same values. Insert one `members` row per real person with role owner, skipping `removed:` tombstones. Drop `users`. All of this fits in one transaction, and the risk is in the code that follows it rather than in the data.

**Queries.**

- *May this person edit this page?* A `members` row for this person on the page's handle or on that handle's `team_id`. One query covers every case, including a manager with no page of their own.
- *Live page for a handle.* The same as today with one table renamed, plus a self-join for the team's page.
- *A team's pages.* `handles where team_id = X`, plus the team's own handle, joined to `pages`.
- *Apply the look.* Publish the team's page, then drop the child handles' cache keys.

**Roles.** A column on `members`, with owner and editor. "Member" is derived from having a handle in the team. If the first version has no separate editor, the column can wait, since any row on the team's handle means you manage it.

**Invitations.** A signed link naming a handle with no `members` row yet. Accepting inserts a row, so nothing is renamed and no photos move. This is the cleanest of the four.

**Billing.** `handles.plan` and `handles.stripe_id`. A team pays on the team's handle, and seats are the count of child handles. A person with two addresses pays twice, unless those addresses form a team, which is the pattern `.scratchpad/multipage/notes.md` found at Linktree. There's no customer record per person, so someone with several subscriptions has several Stripe customers. If that matters, `users` comes back with `plan` and `stripe_id`, making 5 tables.

**Leaving.** Either outcome is one statement. Setting `team_id` to null means the person keeps the page and address. Deleting their `members` row means the team keeps them. Pages can be handed from one person to another the same way.

**Account deletion.** Delete their `members` rows, then delete any handle with no members left and no team. The tombstone becomes simpler, because a suspended handle just stays with no members.

**Multi-page later.** Works exactly as today. Several addresses per person is free, which `multipage/notes.md` wanted to build alongside teams.

**What gets harder.**

- **Every account path changes.** `AccountStore` and `PageStore` both take a user id, and now need "which handle". `MeResponse.handle` becomes a list. The editor needs a current address everywhere, including its backups in `apps/editor/src/state/storage.ts`. `multipage/notes.md` counted the handle in 25 or more files and estimated 3 to 4 weeks before teams work starts.
- **It's more than the promise requires.** If nobody needs several addresses soon, most of that cost buys something unused. It also lands while QA is still in progress.
- **The start flow changes** because "a row appears when they claim an address" now means two rows.

**Where code lives.** `packages/db/src/handles.ts` takes over from `accounts.ts`, with `packages/db/src/members.ts`, `apps/server/src/teams.ts`, `apps/server/src/invites.ts` and `packages/page/src/team-look.ts`.

## Option C: a team is a `users` row (recommended)

The team gets a row with its own id and handle, so it can own pages exactly as a person does. People point at it. The repo already stores a row that isn't a person, the `removed:<handle>` tombstone in `accounts.ts`, so non-Neon ids aren't new.

```diff
 export const users = pgTable("users", {
     id: text("id").primaryKey(),
     handle: text("handle").notNull().unique(),
     suspendedAt: timestamp("suspended_at", { withTimezone: true }),
+    teamId: text("team_id").references((): AnyPgColumn => users.id, { onDelete: "set null", onUpdate: "cascade" }),
+    role: text("role").$type<"owner" | "editor">(),
+    edits: text("edits").$type<"links" | "page">(),
-});
+}, (table) => [index("users_team").on(table.teamId)]);

 export const pages = pgTable("pages", {
-    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
+    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
```

**Resulting tables:** `users` (id, handle, suspended_at, team_id, role, edits), `pages` (unchanged), `stats` (unchanged).

Three kinds of row are told apart by id, with nothing stored to say so: a Neon id is a person, `team:<uuid>` is a team and `pending:<uuid>` is a page waiting for its person. `edits` is only set on team rows. `role` is null for a plain member, so "member" is derived.

**Migration.** Three nullable columns and an index. No existing row changes, and it can go out before anyone uses it.

**Queries.**

- *May this person edit this page?* The page's owner row is the person's own, or the person has a role and the owner row is their team or points at their team. In code: `me.id === owner.id || (me.role && me.teamId && (owner.id === me.teamId || owner.teamId === me.teamId))`. That's one read of two rows by primary key.
- *Live page for a handle.* Today's query with one left join for the look:

  ```sql
  select p.id, p.published, t.published as team_page
  from pages p
  join users u on p.user_id = u.id
  left join pages t on t.user_id = u.team_id and t.slug = ''
  where u.handle = $1 and p.slug = '' and u.suspended_at is null;
  ```

- *A team's pages.* `users where id = X or team_id = X`, joined to `pages`.
- *Apply the look.* Publish the team's page with the existing `publish`, then drop the cache key for each row in that list.

**Roles.** A column, because owner and editor are a stored choice. If the first version only has owners and members, the column could be replaced by one on the team row naming its owner, but `role` is the simpler of the two.

**Invitations.** A signed link naming a `pending:` row. Accepting changes that row's `id` to the person's Neon id, and `onUpdate: cascade` carries `pages` and `team_id` along.

The photo folder is the one snag. `folderFor` hashes the id, so a renamed row loses track of its photos for listing, limits and account deletion. Existing photos still display, because each document stores the full path. So accepting needs a small step that moves those files and rewrites the paths. I'd allow a day for it. Alternatively, a pending page could use a shared folder for the team until it's claimed.

**Billing.** `plan` and `stripe_id` go on `users`, exactly where `data-model.md` already plans them. Pro goes on a person's row, and Team goes on the team's row, in the same columns. `limitsFor(userId)` reads the row and, if `team_id` is set, the team's row. Seats are the count of rows with `team_id = X`. Keeping that count in step with Stripe happens in the one place membership changes. This fits [plans.md](plans.md), whose 25 team pages were written with this option in mind.

**Leaving.** Set `team_id` and `role` to null. The person keeps their page and address, and their own look returns. If the team should keep them instead, change the row's id back to `pending:<uuid>`, and the person has no page until they claim a new address. Both are one statement plus the photo step, so this can wait for the behaviour rules.

**Account deletion.** A member's `removeUser` works as it does now, and the seat count falls by itself. Deleting the last owner must refuse or hand over. Deleting a team removes its row and its page, and the foreign key sets each member's `team_id` to null, so members keep their pages. The tombstone logic is unchanged and already covers team rows.

**Multi-page later.** No change at all, and it applies to teams automatically. `/asterandbell/shop` is a `pages` row with a slug, and each sub-page takes the team's look the same way.

**What gets harder.**

- **One team per person,** enforced by the column. A page takes one look, so a person with one page can only be in one team anyway. The cases this rules out are someone who manages several teams, and someone who wants a personal page alongside a team page under one login. For the first, add `members` (team_id, user_id, role), move the two columns' data into it and drop them, which I'd estimate at 2 or 3 days. The second needs several addresses per person, which is option B.
- **`users` no longer only means people.** Renaming it to `accounts` would be more accurate, and `accounts.ts` already uses that word. Anything counting people must filter on the id. Admin queries are the likely place for a mistake.
- **Renaming a primary key is unusual.** It's safe with the cascades, but it's a move people will want to read twice, and the photo step goes with it.
- **It overrides a written decision.** Decision 1 in `features.md` and a trade-off in `data-model.md` say teams will move the address into its own table. Both need rewriting if you choose this.
- **A manager needs an address.** `handle` is `not null`, so everyone in a team has a page. That matches "a page for each person", though it wouldn't suit an office manager with no public page.

**Where code lives.** `packages/db/src/teams.ts`, `apps/server/src/teams.ts`, `apps/server/src/invites.ts` and `packages/page/src/team-look.ts`. Small changes to `accounts.ts`, `pages.ts` and `limits.ts`. `suspend.ts` and the page cache need nothing beyond the extra key drops.

## Option D: Neon Auth organizations

The appeal is that Neon already has `organization`, `member` and `invitation` tables, with routes for inviting, leaving and changing roles.

**"Just a `team_id`" doesn't hold up.** An organization has a `slug`, but that's unique only among organizations, so it can clash with `users.handle`, and Neon's docs say server-side hooks aren't supported, so Tondo can't check at creation. A team's page also needs an owner. The honest version of this option keeps a `users` row for each team, using the organization's id, as in C. So D replaces C's `team_id` and `role` with Neon's tables, and doesn't remove much else.

```diff
 export const users = pgTable("users", {
     id: text("id").primaryKey(),
     handle: text("handle").notNull().unique(),
     suspendedAt: timestamp("suspended_at", { withTimezone: true }),
+    edits: text("edits").$type<"links" | "page">(),
 });

+// Read only, and managed by Neon. Must be excluded from drizzle-kit so it never migrates them.
+const neonAuth = pgSchema("neon_auth");
+export const member = neonAuth.table("member", {
+    id: text("id").primaryKey(),
+    organizationId: text("organizationId").notNull(),
+    userId: text("userId").notNull(),
+    role: text("role").notNull(),
+    createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
+});
```

The column names and types above come from Better Auth's source and need checking on a real database. Neon's docs don't list them.

**Resulting tables.** Own: `users` (id, handle, suspended_at, edits), `pages`, `stats`. Neon's, from Better Auth 1.7.14 as installed with `@neon/auth` 0.8.2: `organization` (id, name, slug, logo, metadata, createdAt), `member` (id, organizationId, userId, role, createdAt), `invitation` (id, organizationId, email, role, status, teamId, inviterId, expiresAt, createdAt).

**Migration.** One nullable column here, and the Organization plugin is on in Neon. The harder part is local work: Docker's Postgres has no `neon_auth` schema, so `tests/setup-database.ts`, `tests/neon-stand-in.ts` and `fake-store.ts` all need stand-ins for the tables and the routes.

**Queries.**

- *May this person edit this page?* A read across schemas into `neon_auth.member`, which Neon says is fine ([Neon Auth](https://neon.com/auth) says you can query the schema with SQL). No foreign key is possible, and that's already true of `users.id`.
- *Live page for a handle.* C's query, with the team found through `neon_auth.member`.
- *A team's pages.* `member` joined to `users` and `pages`.
- *Apply the look.* As C.

**Roles.** Neon's three: owner, admin and member. They map neatly to the Owner, Editor and Member on the Teams page, with "admin" shown as "Editor". Neon's docs say custom roles and dynamic access control aren't supported, so anything per-person beyond those three goes in Tondo's tables. Neon's rule that a member is read-only applies to organization settings, and Tondo's own check decides who edits pages.

**Invitations.** Neon's `invitation` table and routes, so this is the one option where invitations have a real table, and it isn't Tondo's to maintain. An invitation is tied to an email, and needs either Neon's email toggle, which requires email verification at signup, or a route Tondo builds. A page made for someone who hasn't joined still needs a `pending:` row, so C's rename and photo step come along too.

**Billing.** `plan` and `stripe_id` on the team's `users` row, as in C. Seats are counted from `neon_auth.member`. The browser reaches invitation and leaving routes through the proxy, and with no hooks Tondo doesn't hear about them. Every one of those paths has to be wrapped by a Tondo route, or the seat count drifts from Stripe.

**Leaving.** `organization/leave`, wrapped as above. The page and address stay with the person. Better Auth's page doesn't describe restrictions, such as whether an owner can leave, so that needs testing.

**Account deletion.** Neon removes its own rows as part of `delete-user`, presumably, and I haven't confirmed it. `auth.ts` deletes Tondo's data before Neon's sign-in, so there's a window in which `member` points at a person with no `users` row.

**Multi-page later.** As C.

**What gets harder.**

- **It depends on a partial, beta feature.** Neon's plugin table lists Organization as "Partial" and its page says beta. Teams inside organizations aren't enabled, and hooks aren't supported. `additionalFields` isn't mentioned. Default limits are 100 members per organization and 10 memberships per person, both settable.
- **It saves less than it appears to.** Tondo still needs its own team row, permission check, invitation screen and seat tracking. What it removes is `team_id`, `role` and signing a link.
- **Leaving Neon Auth gets harder,** because membership would have to move too. The repo currently treats Neon as holding only people and passwords.
- **The docs differ on the model.** `how-it-works.md` says Tondo keeps "workspaces, members and addresses", so this needs rewriting too.

**Where code lives.** `apps/server/src/teams.ts` wrapping Neon's routes, `packages/db/src/teams.ts` reading `neon_auth.member`, `packages/page/src/team-look.ts`.

## Comparison

| | A: teams and members | B: handles | C: team is a user | D: Neon organizations |
|---|---|---|---|---|
| Tondo's tables | 5 | 4 | 3 | 3, plus 3 of Neon's |
| Changes existing rows | No | Yes, every one | No | No |
| One list of addresses | No, two tables | Yes | Yes | No without a team row, yes with one |
| `findLive` change | Two lookups | Rename plus self-join | One left join | One left join, across schemas |
| Page before its person joins | Placeholder `users` row | Clean, no rename | Rename plus photo move | Rename plus photo move |
| Invitations | Signed link, pending row | Signed link, pending handle | Signed link, pending row | Neon's table, tied to an email |
| Roles | Column on `members` | Column on `members` | Column on `users` | Neon's fixed three |
| Plan and Stripe id | Two tables | `handles` | `users` | `users` |
| Managing several teams | Yes, though a page can only take one team's look | Yes | No, unless `members` is added | Yes, up to the limit, with the same catch as A |
| Personal page plus team page | No | Yes | No | No |
| Several addresses later | Needs B's change | Free | Needs B's change | Needs B's change |
| Sub-pages later | Yes, with two unique rules | Yes | Yes, no change | Yes, no change |
| Size, without screens and billing | 2 to 3 weeks | 4 to 5 weeks | 1.5 to 2 weeks | 2 to 3 weeks |

## Why C was recommended

- **It meets your rules most closely.** It adds no tables and three columns, each used by a feature on the Teams page. "Is a team", "is a member" and "the look" are all derived.
- **Addresses stay in one unique column.** `/asterandbell` and `/juneaster` can't clash, and that's the database's guarantee rather than code's. This is A's main weakness and D's.
- **Everything that takes a `user_id` already works for a team's page.** That includes `pages`, sub-pages, the tombstone, and the planned `contacts` and `connections` tables.
- **It doesn't close doors.** Adding `members` later is a small migration. Moving to B later costs about what B costs now, because the only thing C adds to that work is a little data to move. So starting with C doesn't make B more expensive.
- **It's the least risky while QA is under way,** because no existing row or route changes meaning until the feature is switched on.

Its costs are real. `users` no longer only means people, the id rename is unusual, and one person can only be in one team. If you already know people will want a personal page next to a team page, I'd choose B instead, and accept the larger change.

## What you needed to decide

Option E settles questions 1 to 6. One team and one personal page per person, no separate addresses, no team row in `users`, no pages before someone joins, no Editor role, and the team page's look is the shared look. Question 7 stays open, and is in [teams-implementation.md](teams-implementation.md). The questions as they were put:

These change the schema. The behaviour rules, such as who keeps an address when someone leaves, whether pending people use a seat, and what happens to a Pro subscription on joining, can wait, because the recommended schema supports either answer.

1. **Can one login belong to several teams, or have a personal page and a team page?** One team and one page means C. Managing several teams means C plus `members`, at 4 tables. A personal page beside a team page means B.
2. **Is several addresses per person coming soon, apart from teams?** `features.md` has "Many profiles under one account" in phase 5, and `multipage/notes.md` suggested building it with teams. Under C, a set of managed pages is a team with pending rows, which may be enough. If people need to switch between their own separate addresses, that points to B.
3. **Are you happy for a team to be a row in `users`,** and should the table be renamed `accounts`? This reverses decision 1 in `features.md`.
4. **Does the first version include pages made for someone before they join?** The Teams page lists this as coming. If it can wait, C's rename and photo step go away at first, and everyone starts by signing up through a link.
5. **Does the first version need Editor as well as Owner and Member?** If not, `role` can be simplified. The Teams page describes three roles, and `how-it-works.md` describes owners choosing between links only and the whole page. These are two different ideas, and `edits` only covers the second. Which do you want first?
6. **Is the shared look the team page's look?** I've assumed yes, so the team page has to use the look everyone gets, and it needs no column. If the team's page should look different from its members' pages, the look needs its own `look` column on the team row.
7. **Should the Organization plugin be switched off in the Neon Console?** I'd do this under A, B or C, whatever else you decide, once someone has checked it's on.

## What I couldn't verify

- **Neon's tables.** Neon's docs don't list the columns of `organization`, `member` or `invitation`. Those above come from the Better Auth source installed in this repo, and Neon's managed version could differ in names or types.
- **Direct reads.** Neon's product page says the schema can be queried with SQL, in a sentence about users, sessions and OAuth configuration. I'm assuming it applies to the organization tables too.
- **Whether the plugin is on for Tondo.** Neon's docs say it's on by default, and I didn't check the real project.
- **Sizes.** They're estimates, and `multipage/notes.md`'s count of 25 or more files is the only measured input, taken at an earlier commit.
- **Existing data.** I assumed few rows exist, since the product hasn't had a private release, and didn't check the real database.

Neon sources: [Organization plugin](https://neon.com/docs/auth/guides/plugins/organization), [Plugins](https://neon.com/docs/auth/guides/plugins), [Neon Auth](https://neon.com/auth). Better Auth: [Organization](https://www.better-auth.com/docs/plugins/organization).
