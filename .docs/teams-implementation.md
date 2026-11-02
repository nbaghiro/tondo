# Teams implementation plan

This plan builds what `apps/marketing/src/pages/teams.astro` promises, on top of one address per page and the flat plans. It replaces the earlier version of this file, which predated both decisions. That version is in git history, at `71c2e3d`.

**Status:** see [Milestones](#milestones). The numbers under [Working defaults](#working-defaults) aren't the owner's final choices.

## What's being built

A team has one owner, who pays, and up to 10 people. Each person brings one of their pages, and the team can also have up to 5 pages of its own. The team's oldest page of its own holds the team's look. When the owner publishes that page, its look reaches every page on the team, with nothing copied into anyone's document.

| What the site promises | How it's made true |
|---|---|
| A page and address for each person, plus the team's own page | Each person's page joins through `pages.team_id` and keeps its `user_id`. A team's own page has `team_id` and no `user_id` |
| A team look that reaches every page when it changes | Merged when a page is read, from the look page's published copy. Publishing drops every page on the team from the cache |
| Owner: manages people, the team's look and the plan | `teams.owner_id`, and only the owner reaches those routes |
| Editor: edits any page on the team, not the plan | `users.editor`, read in the one place that picks a page |
| Member: edits their own page, the team look stays | The default. The look panel is locked, and visitors get the team's look whatever the member's document holds |
| Invitation links, so people can sign in to the page made for them | A signed link can name one of the team's own pages. Accepting sets that page's `user_id` |
| Duplicating a page to start the next person's | `POST /me/team/pages` with `from`, and its photos are copied into the new page's folder |
| A person accepts an invitation and chooses which page joins | The join screen lists their pages, and the page made for them if there is one. Someone with no page yet makes one first |
| Can a page we've already made join? | Yes, as above. Leaving keeps the page and address, and the page's own look comes back |
| Try before paying | Anyone can make a team and build its pages. Inviting people and putting team pages online need the owner's Pro |

## Working defaults

These live in `packages/page/src/limits.ts`, and the owner can change any of them.

| Default | Value |
|---|---|
| People on a team, counting the owner | 10, as `PLANS.pro.people`. It's 0 on Free and Starter, and that 0 is also what says a plan doesn't cover a team |
| A team's own pages | 5, as `TEAM_PAGES`. A page waiting for its person counts until they accept |
| Pages each person brings | 1 |
| Help me credits | The owner's 300 are shared. See [Help me](#help-me) |
| How long an invitation lasts | 7 days |
| Who can create a team's page | Owner and Editor |
| Editors and the team's look | They can't change it. They can edit the words on the look page |

## Data

One new table and three new columns. `teams.handle`, `handles.ts` and the advisory lock are gone, because `pages.handle` is the one list of addresses and a team's address is just a page's.

```diff
 export const users = pgTable("users", {
     ...
+    /** Can edit any page on their team. The owner is `teams.owner_id`, and everyone else is a member. */
+    editor: boolean("editor").notNull().default(false),
 });

+export const teams = pgTable("teams", {
+    id: uuid("id").primaryKey().defaultRandom(),
+    ownerId: text("owner_id").notNull().unique().references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
+    /** Invitation links made before this stop working. */
+    invitesFrom: timestamp("invites_from", { withTimezone: true }).notNull().defaultNow(),
+});

 export const pages = pgTable("pages", {
-    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
+    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
+    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
     ...
 }, (table) => [
+    check("pages_have_owner", sql`num_nonnulls(${table.userId}, ${table.teamId}) >= 1`),
+    uniqueIndex("pages_one_joined").on(table.userId).where(sql`user_id is not null and team_id is not null`),
 ]);
```

**This drops `users.team_id` from option E.** A member always has exactly one joined page, and an owner is found through `teams.owner_id`, so a person's team is derived. `pages_one_joined` gives both "one page per person" and "one team per person" from one index, since a person can't join a second team while a page of theirs is on the first. The owner may have no joined page, so an owner can run a team without a public page of their own.

**`invites_from` is a column the old plan avoided, and it's used.** Members share the owner's credits, which cost money per turn, so a forwarded link has to be stoppable. Removing someone also moves it, so an old link can't bring them straight back. There's still no invitations table.

**No team name column.** A team's name is `header.name` on its look page.

### What's derived

| Value | How |
|---|---|
| Who owns a team | `teams.owner_id` |
| A person's team | The team they own, or the `team_id` of their joined page |
| A page's kind | `user_id` only: personal. Both: joined. `team_id` only: the team's own |
| People on a team | The owner, plus joined pages with another person's `user_id` |
| The look page | The oldest page with `team_id` set and no `user_id` |
| The team's name | `header.name` on the look page |
| Whether a team is covered | `limitsOf(owner's plan).people > 0` |
| A team page being taken down | The owner's `suspended_at` |

**Migration.** `0007`, generated. It adds to tables and changes no existing row, and every existing page passes the check. It's for the e2e database while this is built. The owner applies it to the dev database when ready, because the QA servers use that one.

## Who pays, and which pages stay online

This is the rule, in full. "Covered" means the owner's plan is Pro and hasn't ended.

**While a team is covered:**

- The team's own pages can be online, up to 5, on the owner's plan. They don't use the owner's 5 live pages.
- Each person's joined page can be online, whatever that person's own plan is. It doesn't use their plan's live pages, and this includes the owner's joined page.
- Everyone's other pages stay separate. They follow that person's own plan, counted oldest first, and don't take the look.

**When the owner's plan ends:**

- The team's own pages go offline, like any other lapsed page. Their content and addresses stay.
- The team look stops, so every page shows its own look again.
- A joined page now counts like any other page of that person's, oldest first, against their own plan.
  - A member on Free has no live pages, so their joined page goes offline.
  - A member on Starter has 1 live page, so whichever of their published pages is oldest stays online and the rest go offline. If the joined page is the older one, it takes that place from their other page.
  - A member on their own Pro has 5, so their pages normally stay online.
- People stay on the team. Nobody can join, and no new links can be made.
- When the owner pays again, everything comes back with no other step.

**Other cases:**

| Case | What happens |
|---|---|
| A member has their own paid plan and is on a covered team | They keep their plan, and Tondo doesn't touch their subscription. The joined page doesn't use one of their live pages, so they have one spare while they're on the team |
| Someone on Starter or Free tries to invite | Refused with `plan_limit`, and the Team screen offers Pro |
| Publishing a team's page when not covered | A publish issue that says the owner's plan needs to be Pro. Owner and Editor both see it |
| Someone leaves or is removed | The page goes back to counting against their own plan, straight away, with the same oldest first rule |
| `PLANS_ON` is off | Everyone behaves as Pro, as they do today, so every team is covered |

One person never pays per head, and members bill nothing. Handing a team over doesn't move a subscription, since the plan is per account. The new owner has to be on Pro first when plans are on, so nobody's page goes offline by surprise.

## Who can do what

The one place is `pageOf` in `packages/db/src/pages.ts`, a SQL condition, so the check and the read or write are the same statement. A page someone can't reach answers 404.

```ts
const pageOf = (userId, pageId) => and(eq(pages.id, pageId), or(
    eq(pages.userId, userId),
    inArray(pages.teamId, teamsIEdit(userId)),
));
```

`teamsIEdit` is teams this person owns, or where they're an editor with a joined page, in both cases only if they aren't suspended. A suspended person keeps the rules that exist for their own pages and loses reach over everyone else's.

| Action on a page | Personal page of mine | My joined page | A teammate's joined page | Team's own page | Look page | Someone else's personal page |
|---|---|---|---|---|---|---|
| **Owner** read, save, publish, unpublish, stats, photos | Yes | Yes | Yes | Yes | Yes | 404 |
| **Editor** same | Yes | Yes | Yes | Yes | Yes, with the look locked | 404 |
| **Member** same | Yes | Yes | 404 | 404 | 404 | 404 |
| **Owner** change address | Yes | Yes | 403, it's that person's | Yes | Yes | 404 |
| **Editor** change address | Yes | Yes | 403 | 403 | 403 | 404 |
| **Member** change address | Yes | Yes | 404 | 404 | 404 | 404 |
| **Owner** delete | Yes, unless last | 409, leave or swap first | 403 | Yes | 409 | 404 |
| **Editor** delete | Yes, unless last | 409 | 403 | 403 | 403 | 404 |
| **Member** delete | Yes, unless last | 409 | 404 | 404 | 404 | 404 |

**Editors and the look.** An Editor's save of the look page is refused with 403 if `look`, `paint` or `style` differ from the stored draft. They can't publish it while its look differs from what's live, which covers an owner's look change still waiting, and they can't take it down. Help me refuses too.

**Members and the look.** A member's save isn't checked, because visitors get the team's look whatever their document says, and their own look has to survive for when they leave.

| Team route | Owner | Editor | Member | Not on the team |
|---|---|---|---|---|
| `GET /me/team` | Yes | Yes | Yes | 404 |
| `POST /me/team` `{ name, handle, page? }` | 409 | 409 | 409 | Yes |
| `DELETE /me/team` `{ name }` | Yes | 403 | 403 | 404 |
| `POST /me/team/invites` `{ page? }` | Yes | 403 | 403 | 404 |
| `DELETE /me/team/invites` | Yes | 403 | 403 | 404 |
| `POST /me/team/pages` `{ name, handle, from? }` | Yes | Yes | 403 | 404 |
| `PUT /me/team/page` `{ page }`, which page of mine is on the team | Yes, or null | Yes | Yes | 404 |
| `POST /me/team/leave` | 409 | Yes | Yes | 404 |
| `PATCH /me/team/people/:handle` `{ role }` | Yes | 403 | 403 | 404 |
| `DELETE /me/team/people/:handle` | Yes, 409 on their own | 403 | 403 | 404 |
| `POST /me/team/handover` `{ handle }` | Yes | 403 | 403 | 404 |
| `GET /invites/:token` | Public, limited by address. 410 for expired, altered or ended links, with one message for all | | | |
| `POST /me/team/join` `{ invite, page }` | 409 | 409 | 409 | Yes, or 410, 409 team full, 403 `plan_limit` |
| `POST /me/team/takeover` `{ invite }` | | The person named | The person named | 403 |

People are named by the address of their joined page, so Neon ids never reach the browser. `tests/teams.spec.ts` checks all of this as a table against real Postgres.

## Invitations

Signed links with no table, in `apps/server/src/invites.ts`. The key is derived from `NEON_AUTH_COOKIE_SECRET`, so there's no new secret to set up. Without Neon nobody can sign in anyway.

- **A token says** which team, the time it was made, when it ends, and optionally a page or a person to take over.
- **It stops working** at 7 days, or when the owner presses End all links, or when someone is removed. Both of those move `invites_from`. A deleted team ends every link, since the row is gone.
- **It can be used more than once** until then, and the screen says so. A link naming a page works once, because the page then has its person.
- **Pending invitations can't be listed,** and the screen says that too.

**Accepting**, in one transaction: lock the team row, check the link against `invites_from`, lock the person's row, refuse if they own a team or have a joined page, count people under the lock, then set `team_id` on their chosen page or `user_id` on the page made for them. The team lock is what makes the tenth and eleventh person safe, and the person lock and `pages_one_joined` are what make two invitations at once safe.

**The route through sign-up.** A link is `/app/join?invite=<token>`, with no cookie. Someone not signed in goes to `/signup?invite=<token>`, and sign-up, log-in, the email code and Google's return all carry it, as they do `handle`. Then:

| Person | What they see |
|---|---|
| New, and the link names a page | The join screen, with that page. They don't need the start flow |
| New, and the link names no page | The start flow, then the join screen with the page they just made |
| Has pages | The join screen, listing their pages, plus the page made for them. The oldest is chosen first |
| Owns a team, or is on one | The screen says so and offers the Team screen |
| Link has ended | "This invitation has ended. Ask the team's owner for a new link." Any page they have stays |

Joining changes a live page at once, with no publish, so the screen says what will happen: the page takes the team's look, and the owner and any editors can edit it and see its numbers.

**A page made for someone.** A team's own page can't be claimed if it's the look page. If its document uses a photo from another of the team's pages, that file is copied into the page's own folder on accepting, so deleting the team later can't break it.

## What happens at each edge

| Event | Pages and addresses | Look | Order of work |
|---|---|---|---|
| Member leaves or is removed | Keeps their page and address | Their own returns, with no writes | Clear `team_id` and `editor`. On removal, move `invites_from`. Drop their addresses from the cache |
| Member deletes their account | Their pages go, as today | | Their row goes, and the people count falls by itself |
| Owner tries to leave | Refused | | "Hand the team to someone else, or delete it." |
| Owner deletes their account | Refused until they hand over or delete the team | | The check goes first, before billing and photos. The `restrict` key is the backstop |
| Team handed over | Team's pages stay | Unchanged | The new owner accepts a link. If the former owner has a joined page they stay as a member, and otherwise they're off the team |
| Team deleted | The team's own pages and addresses go. Members keep theirs | Everyone's own returns | Remove the team's photos, then in one transaction: lock, clear joined rows, delete the team so the cascade takes only its own pages. A suspended owner's addresses stay out of use, as for an account |
| Owner suspended | Their pages and the team's stop being served | Stops | `suspend.ts` finds the owner through a team page's address, and says so |
| Member suspended | Their pages stop being served, and others are unaffected | | Today's behaviour |

**Why clearing goes first.** `pages.team_id` cascades so that a team's own pages go with it. Without the clear, the same cascade would delete members' pages, so `deleteTeam` does both in one transaction under the team lock, and a test covers a member's page surviving, and one joining at the same moment.

## The shared look

`packages/page/src/team-look.ts` has `teamLookOf` and `withTeamLook`. `look`, `paint` and `style` are shared. `seed`, `header`, `blocks`, `title`, `description` and `timeZone` stay with each page, so each person's painting differs. The team's value is used even when it's absent, so a member's own `paint` can't show through.

- **On the live page,** `findLive` also returns the look page's published copy, and `live()` in `app.ts` applies it when the team is covered and the owner isn't suspended. `packages/render` doesn't change.
- **Reaching every page.** Publishing or taking down the look page drops every address on the team from the cache, so the next visit shows it. No other row is touched, so an open tab gets no false "changed somewhere else". Limits: a second server instance could be 15 seconds behind, and a member's open editor shows the old look until it reloads.
- **In the editor.** `DraftResponse` keeps returning the page's own document and gains `team`, with the name, the look to draw, and whether the look is locked. Previews draw the merged page, and editor state stays unmerged, so autosave can't write the team's look into someone's document.
- **With no published look page,** there's no team look yet and pages show their own.

## Help me

Credits belong to a person, so the rule is about who's spending.

- **Someone with their own paid plan** spends their own credits, on any page.
- **Anyone else on a covered team** spends from the owner's credits, on any page.
- **Everyone else** spends their own, as today.

The `usage` table doesn't change, because spending from the pool just charges the owner's row. `set_look` and `set_style` refuse on a locked page, with "This page uses your team's look, so it's set on the team's page."

**Photos.** A team's own page stores photos in its own folder, as any page does. They count against the owner's plan, across the team's own pages. A joined page's photos count against that person, whose allowance is the owner's while the team is covered, if that's more than their own. The picker lists the photos of whoever the page belongs to. Account deletion removes a person's folders and leaves the team's alone.

## In the app

| Surface | Change |
|---|---|
| Nav | `Team`, under Manage, at `/team` |
| Switcher | Your pages first, then the team's name as a heading, with the team's pages and each person's page. New page still means a page of your own, and its count leaves team pages out |
| `TeamPage.tsx` | As in the marketing window: a header with the team and how many people, Invite someone, and rows with photo, name, address and role. Below that, the team's pages, then the look, and at the end leaving, handing over or deleting |
| `JoinPage.tsx` | The join screen, at `/join`, without the sidebar. It also handles taking over |
| Home, Analytics, Page settings | Follow the chosen page, as they do. Settings leaves out what this person can't do on this page, and says whose it is |
| Builder | The look panel shows a locked card on any page with a team look. The owner's card on a team's other page links to the look page |
| Publish panel | On the look page: "This also changes the look on 4 other pages." |
| Account | Says who pays for the team's pages, and Delete says to hand over first |

Design stays Porcelain and matches Home and Page settings. The phone comes from `components/Phone.tsx`, with no buttons on it.

**No `TEAMS_ON`.** The earlier plan had one. The site already offers teams, nothing goes out until the owner deploys, and `PLANS_ON` already holds back everything to do with money.

## Not built

- **Team statistics.** The site doesn't promise a team total, and Analytics follows each page, so an owner or editor can read any page's numbers there.
- **Email.** The owner copies a link. Email needs a provider, which hasn't been chosen.
- **Stripe work.** There's nothing to do for teams at a flat price, and real Stripe stays untouched.
- **Roles beyond the three,** several teams per person, and a member bringing more than one page.

## Terms and Privacy need

For the owner, ideally with a lawyer. I haven't changed either page.

**`terms.astro`, a new section "Teams":**

- A team has one owner, who's responsible for the team's own pages and for the plan that covers them.
- Each member stays responsible for their own page and keeps their account. Editors and the owner can change a member's joined page and publish those changes, and the member accepts that by joining.
- While you're on a team, your joined page uses the team's look, which can change without you doing anything.
- Pages made for someone become theirs when they accept, and stay theirs if they leave.
- The owner can remove people, end invitation links, hand the team over or delete it. Deleting removes the team's own pages and addresses straight away. Members keep their pages.
- An owner has to hand over or delete their team before deleting their account.
- Anyone with an invitation link can join until it ends, so share it with care.
- If the owner's plan ends, the team's own pages go offline, and joined pages follow each member's own plan.
- If we take down an owner's account, the team's pages go too.
- Shared Help me credits: members without their own paid plan spend the owner's credits.

**`terms.astro`, existing sections:** "Addresses" should say a team's page address follows the same rules, and "Ending and deletion" needs the sentence on owners. The line about changing an address still says "your account" and should be per page.

**`privacy.astro`:**

- `#visits`: if your page is on a team, the owner and any editors see that page's views and clicks, including from before you joined, and that stops when you leave.
- `#what-we-collect`: which team a page is on, who owns it and each person's role. Other members see your page's name, photo and address.
- `#cookies` doesn't change, because invitations use no cookie.
- Update "Last updated".

## Testing

**Unit, in `pnpm check`:**

- `packages/page/src/limits.test.ts`: the online rule, for every case in [Who pays](#who-pays-and-which-pages-stay-online).
- `packages/page/src/team-look.test.ts`: the merge.
- `apps/server/src/invites.test.ts`: round trip, expired, altered, and one kind used as another.

**End to end, `tests/teams.spec.ts`, against real Postgres:**

1. Who can do what, as tables across every route above, for owner, editor, member, ex-member and stranger.
2. Concurrency: two owners inviting one person who accepts both at once, a tenth and eleventh person at once, two people claiming one made page, a member joining while the team is deleted, a sixth team page.
3. Edges: the owner can't leave or delete their account, before any photo goes. A removed member's pages and address stay. A deleted account with a team. An expired link, an ended link and a removed person's old link.
4. The look reaches every page with no wait, keeps words and paintings different, adds no script, doesn't move anyone's `updated_at`, and goes on leaving, removal and deletion.
5. Plans: the lapse rule with a member on Free, Starter and Pro, and paying again.
6. The whole invitation through sign-up, by screen, on both viewports, plus the team screen and locked look panel.

## Milestones

Each passes `pnpm check` and `pnpm e2e --workers=3` before its commit.

| # | Milestone | Main files | Status |
|---|---|---|---|
| T1 | Migration, numbers, the look merge, `team` and `join` reserved, the online rule | `schema.ts`, `limits.ts`, `team-look.ts`, `handle.ts` | Not started |
| T2 | Who can edit: `pageOf`, page kinds, routes, the switcher's data, photos by page's owner | `db/pages.ts`, `server/pages.ts`, `photos.ts`, `contract` | Not started |
| T3 | Team store and routes, signed links, edges, suspension, account deletion | `db/teams.ts`, `server/teams.ts`, `invites.ts`, `auth.ts`, `suspend.ts` | Not started |
| T4 | The shared look: `findLive`, cache drops, editors and the look, Help me's lock and shared credits | `app.ts`, `assistant.ts`, `LookPanel.tsx`, `Canvas.tsx` | Not started |
| T5 | Team screen, switcher groups, Settings and Account by role | `TeamPage.tsx`, `PageSwitcher.tsx`, `Shell.tsx` | Not started |
| T6 | Joining through sign-up, the start flow and the join screen | `JoinPage.tsx`, `auth-form.ts`, `main.tsx`, `auth.ts` | Not started |
| T7 | Plans: gating on the owner's Pro, the lapse rule on screen | `pages.ts`, `TeamPage.tsx`, `tests/teams.spec.ts` | Not started |
| T8 | Docs, QA list and the plan's status | `README.md`, `.docs/*` | Not started |

The old T6 (team statistics) and T7 and T8 (per-seat billing, 25 team pages) are gone, for the reasons above. T9 was going on sale, which is the owner's step, along with Stripe, Terms and deploying.

## Decisions still open

1. **The numbers** under [Working defaults](#working-defaults).
2. **Owner's page optional.** An owner can run a team with no page of their own on it. The site's "a page for each person" still holds for everyone who has one. I chose this so an office manager can run a team.
3. **Editors and the look.** The site gives the look to the Owner, and says Editors edit any page. I read that as Editors changing the look page's words and not its look.
4. **Credits for members with their own plan.** They spend their own.
5. **Takeover needs Pro first.** It's refused otherwise when plans are on.
6. **Neon's Organization plugin.** Neon's docs say it's on by default, and `auth.ts` forwards every path under `/api/auth/*`, so stray rows may be possible. Tondo reads none of them. I haven't checked the real project or changed anything.

## What I couldn't verify

- **Neon.** Row locks and the partial index are standard Postgres, tested on the Docker database, not on Neon's pooled connection.
- **Real sign-in and email.** These run against the stand-in, as all of Tondo's tests do.
