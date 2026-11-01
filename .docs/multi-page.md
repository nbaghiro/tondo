# More than one page per person

**Decided on 2026-11-01: option 2, below, with Pro at 5 pages, no redirects from old addresses, and this work replacing M6 before charging.** The owner also chose the Home design under [Home and the builder](#home-and-the-builder). The build plan is in [multi-page-implementation.md](multi-page-implementation.md), and there's no go to build yet. There are no users, so that plan needs no compatibility work, which simplifies the migration and photo sections below. Other options are kept as the record of how this was weighed.

The rest was written as a proposal on 2026-11-01. Nothing here is built, and no code changed. I read the code in the working tree while another agent was building M1 to M5, so recheck line-level details before building. Sizes are my estimates for one developer. The SQL hasn't been run. Tondo has no users yet, so every statement about what people want is an assumption, marked as one, and nobody has been interviewed.

## Recommendation

I recommend option 2: every page has its own address, and sub-pages aren't built for now.

**What a person gets on Pro:** up to 5 pages, such as `tondo.page/maya` and `tondo.page/my-band`. Each has its own look, draft, publishing, statistics and share link, and nothing on the public page says they're connected. They share one login, one bill and one photo allowance. Free stays at 1 live page.

**How it's stored:** the address moves from `users.handle` to a new `pages.handle` column. It adds no table.

1. **It covers what sub-pages can't.** A band page can't honestly live under `/maya/`. Sub-pages can serve someone who is happy to show one name, and they can't serve someone who wants two. A separate address can serve both, a little less neatly.
2. **It's the smaller public change.** `GET /:handle`, `/l/:handle/:target`, the cache key, the report link and the share link keep the shape they have today. Sub-pages need a two-part version of each, plus slug rules. The cost moves to the account code instead, which is about one week more than M6.
3. **Teams gets simpler.** With `pages.handle` as the only list of addresses, a team address is just another page's address. One unique constraint then guarantees that no address is taken twice, and the advisory lock and cross-table checks in `teams-implementation.md` go away.
4. **Sub-pages stay possible.** They can be added later with two nullable columns and no change to existing rows, as option 3 shows. `/maya/shop` can meanwhile open a tab on Maya's page, which `features.md` already plans for phase 4 and which covers much of the shop and links case.

**Weaknesses.** This touches account code while M1 to M5 are landing, so it should start after them. `tondo.page/maya/shop` is a tidier address than `tondo.page/maya-shop`, and option 2 gives that up for now. Five addresses at $6 makes Pro attractive to an agency, which weakens Team. Addresses are scarce, so holding several raises a squatting question that sub-pages don't have.

**What would change my mind** is listed [after the options](#what-would-change-my-mind). The [decisions you need to make](#decisions-for-the-owner) are at the end.

## What the code does now

- **Address:** `users.handle` is unique and required, one per person. A `users` row appears when someone claims an address, and `claimHandle` inserts their first page in the same transaction.
- **Page:** `pages` has `user_id` and `slug`, unique together. `slug` defaults to empty, and the empty slug is the main page. No code creates any other slug, so every person has exactly one page.
- **How they meet:** `findLive(handle)` joins the two and reads the row with the empty slug. `mainPageOf(userId)` picks the page for every signed-in route, and no route names a page.
- **Public routes:** `GET /:handle` and `GET /l/:handle/:target`, with a cache keyed by handle.
- **Statistics:** `stats` hangs off `pages.id`, so counts are already per page and survive an address change.
- **Suspension:** `users.suspended_at` stops serving a person's page. If a suspended person deletes their account, `removeUser` writes a `removed:<handle>` row so the address stays out of use.
- **Changing an address:** the old one stops working at once and anyone can claim it. The Terms say so, and say old addresses aren't redirected.
- **Photos:** `folderFor(userId)` hashes the person's id, and each document stores the full file path. So public image addresses contain the same folder for everything one person uploads. This matters below.
- **Sign-up:** `deploy.md` says email verification is off by default, so one person can already make several free accounts.
- **In progress:** `plan`, `stripe_id` and `ends_at` are in the working tree's `schema.ts`, and `packages/page/src/limits.ts` has `pages: 10`. M6 is marked on hold, pending this doc.

## What "totally separate" should mean

This is my reading of the owner's words, and it's an assumption to confirm in decision 2.

| Thing | Separate pages | Why |
|---|---|---|
| Address | Each its own, at the top level | This is the point of the request |
| Look, name, photo, sections | Each its own | Already true, since each document holds its own |
| Draft and publishing | Each its own | One page going live shouldn't touch another |
| Statistics | Each its own. A combined total can wait | `stats` already works this way |
| Share link, title, description, QR code | Each its own | Already per document, apart from the address |
| Public connection | None, unless the person adds a link | Includes what's visible in page source, see photo folders below |
| Custom domain, once built | One per page, up to a plan limit | Moves the planned `users.domain` to `pages.domain` |
| Contacts, once built | Each page's sign-ups kept apart | `contacts` should carry a page id. A band's list isn't a solo artist's |
| Login | Shared | Two passwords is what option 4 offers instead |
| Bill and plan | Shared, one plan covers them all | Simpler than Linktree's plan per page, and it's what a person with a $6 plan would expect (an assumption) |
| Photo allowance and Help me credits | Shared, counted per person | Nobody sees these but the person |

**A leak to fix under any option with separate pages.** Two pages by one person show image addresses with the same `uploads/<hash>/` folder, so anyone reading the source can connect them. I read this from `apps/server/src/photos.ts` and didn't render it to confirm. Hashing the page id for new uploads closes it. The photo picker and the 25 or 2,000 limit then list several folders, and account deletion removes each. `teams-implementation.md` already moves a team page's photos to `folderFor(team.id)`, so this is the same kind of change. About 1 day.

## What people would use it for

These cases come from the owner's brief and the examples Tondo already uses. I haven't spoken to anyone, and I don't know how common each is. The cells are my judgement of fit, using today's features where they exist.

| Case | Tabs on one page (built) | Sub-pages, `/maya/band` | Own address, `/my-band` |
|---|---|---|---|
| Musician with a band and a solo page | No. One look and one name | Poor. The band appears to belong to Maya, and other members may object | **Yes** |
| Freelancer with two businesses under different names | No | Poor. Clients of one see the other's name | **Yes** |
| Freelancer with two services under one name, such as `/maya/weddings` and `/maya/portraits` | Workable, up to 4 tabs and one look | **Yes** | Yes, with a longer address |
| One person's shop and links | Workable. A direct link to the tab would make it good | **Yes** | Yes, with a longer address |
| A page for one campaign or tour that later comes down | Poor | **Yes** | Yes, though it uses up a scarce name and a page slot |
| Someone keeping work and personal apart | No | No | **Yes** |
| Someone running pages for a few clients | No | No, as `plans.md` says | Yes, one login and no handover yet |
| A studio with a page for each service under its own name | Workable | **Yes** | Yes, longer addresses |

Sub-pages have two strengths: the name reads as part of one identity, and they spend no scarce names. They can't serve anyone whose second page isn't part of the first identity. Each address option can serve every row, some less tidily. That difference is the main reason for the recommendation.

## What other products do now

All read on 2026-11-01 from public pages, without signing up. Prices are USD as shown, per month unless marked. Anything I couldn't read directly is marked. The [earlier notes](../.scratchpad/multipage/notes.md) and [plans.md](plans.md) have more on prices.

| Product | Model | How many, by plan | Price | Source and status |
|---|---|---|---|---|
| Linktree | Separate addresses. Each Linktree has its own username, "stays separate", and you change with "Switch Linktrees" | No limit stated. Above 10 upgrades, you fill in an Enterprise form | Each paid plan covers one Linktree, with no multi-Linktree discount mentioned. $9, $17, $35, or $7, $14, $30 billed yearly | [Create and manage](https://linktr.ee/help/en/articles/5434124-how-to-create-and-manage-multiple-linktrees), [upgrade several](https://linktr.ee/help/en/articles/9794401-upgrade-multiple-linktrees). Its [pricing page](https://linktr.ee/s/pricing) shows no prices, which come from a [capture dated 2026-10-26](https://pricingsaas.com/companies/linktree/diffs/2026W44) |
| Beacons | Sub-pages and separate Websites. It describes sub-pages as for "personal and business profiles" | Sub-pages unlimited on all plans. Websites 1, 5, 10, 15, with 1, 3, 5, 10 pages each | $0, $10, $30, $100 | [Plans](https://beacons.ai/i/plans), [new page](https://help.beacons.ai/en/articles/4697281). Address format and how visitors reach a sub-page aren't documented. A [manager article](https://help.beacons.ai/en/articles/4705857) on several accounts under one login returned 404, so I only saw a search summary |
| Liinks | Tabs on all plans. Profiles on Pro | Starter one profile. Pro 5 per pack, up to 100 | $5. $12 per pack, or $120 a year. No free plan | [Pricing](https://liinks.co/pricing), [team pricing](https://www.liinks.co/help/article/pro-plan-team-members-pricing), [tabs](https://www.liinks.co/help/article/multiple-pages). A tab address on Pro looks like `liinks.co/you#shop`. What I read didn't confirm each profile has its own username |
| Stan | Separate accounts, each needing "its own unique email address" and "its own separate subscription". You switch from the username menu | No limit found | $29, $99 per account, with no bundle or discount | [Help, updated 2026-06-23](https://help.stan.store/article/127-can-i-create-more-than-one-stan-store-account), [pricing, updated 2026-07-22](https://stan.store/blog/stan-store-pricing/) |
| Carrd | Sites, with sections to "simulate" pages. Drafts and archived sites use up slots | Basic 3, Pro Lite 3, Pro Standard 10, Pro Plus 25, up to 1,000 | Yearly only: $0, $9, $19, $49 | [Pro](https://carrd.com/pro), [slots](https://carrd.com/docs/account/understanding-site-slots). What I read didn't state the address of each site |
| Later | Link pages tied to social sets. A scheduling product | 1, 2, 6 social sets. Extra sets $11.25 on Growth and Scale | $18.75, $37.50, $82.50, billed yearly | [Pricing](https://later.com/pricing/). The rule of one page per social set comes from a search summary of [its help](https://help.later.com/hc/articles/360042743314), which returned 403. A third-party review disagreed, so it's unconfirmed |
| Campsite | Profiles on paid plans | Free none. Pro+ says 6 | Pro $7, Pro+ $24. Extra profile $1.50, or $15 a year | [Pricing](https://campsite.bio/pricing). The page doesn't say what Pro includes and has conflicting "1 profile" labels |
| Milkshake | Separate sites by switching accounts | "Up to 5", with no plan stated | $0, $2.99, $6.99, $10 | [Home](https://milkshake.app), [pricing](https://milkshake.app/pricing) |
| Choko | Sub-pages at `choko.link/username/page`, each with its own theme and statistics | Plus: main page and 10 more | Not on that page | [Multiple pages](https://choko.link/en/features/multiple-pages) |
| Lnk.Bio | Both: swipeable pages and multi-account plans | 3, 5, 10 pages. 3 to 50 accounts | 3 accounts: $2, $3, $8 | [Multi-account](https://lnk.at/multi-account) |

**What I take from this.** These are what products chose to sell, which doesn't show what people want.

- Separate addresses are the more common way to sell more than one page: Linktree, Liinks, Campsite, Lnk.Bio and Milkshake, with Stan doing it through separate accounts. Sub-pages appear at Beacons, Choko and Lnk.Bio.
- Beacons and Lnk.Bio offer both kinds, so doing both has precedent. I couldn't see how either explains the difference.
- Beacons calling sub-pages suitable for "personal and business profiles" is the one claim against my view. I couldn't see what address a visitor gets there.
- **Tondo's price would be low.** Five addresses at $6 undercuts Liinks at $12 for 5. If Campsite's Pro includes one profile, 5 there costs $13, though its page doesn't say. Lnk.Bio is cheaper, at $2 for 3 on its most basic tier.

## The options at a glance

"Notes" means `.scratchpad/multipage/notes.md`, which uses its own letters.

| | 1: Sub-pages only | 2: Own address per page (recommended) | 3: Both | 4: A second account |
|---|---|---|---|---|
| Example | `/maya`, `/maya/shop` | `/maya`, `/my-band` | `/maya`, `/maya/shop`, `/my-band` | `/maya` and `/my-band`, two logins |
| In the notes | Model A | Model B, stored differently | Model D, stored differently | Not covered |
| Serves a band or second business | No | Yes | Yes | Yes |
| Serves a shop under one name | Yes | With a longer address or a tab link | Yes | Awkwardly |
| New tables | 0 | 0 | 0 | 0 |
| Column changes | None | `pages.handle` and `created_at` added. `users.handle`, `pages.slug` removed | Option 2, keeping `slug` and adding `parent_id` | None |
| Free | 1, plus 1 draft | 1, plus 1 draft with no address | Same as 2 | 1 per account |
| Pro at $6 | 10 pages | 5 pages, each with an address | 5 addresses, 10 pages in all | 1 per account, so $6 for each |
| Team's address | Second table, needing a lock | **One unique column** | One unique column | Second table, needing a lock |
| Size | 2 to 3 weeks | 3 to 4 weeks | 4 to 5 weeks | Up to 2 days, more with a switcher |

**Why not a `handles` table?** It's the design `features.md` and `data-model.md` expected, and it would work. Under the owner's rules it needs a reason, because a page and its address have the same life in option 2: one is created with the other, and deleting the page frees the address. A table becomes the better answer if an address has to outlive its page, such as old addresses that keep redirecting, or addresses held with no page behind them. I'm proposing neither, so I'd leave it out. See decision 12.

## Option 1: Sub-pages only

This is M6 as written in `plans-implementation.md`.

**What a person sees.** One address. Add a page, name it, and it lives at `tondo.page/maya/shop`. Visitors can always read Maya's name in the address, so the pages are visibly connected.

**Addresses and claiming.** The address is claimed once, at sign-up. Slugs use a new `isValidSlug` with their own short reserved list, because `isReservedHandle` blocks words people will want, such as `about` and `store`.

**Schema.** None. `pages.slug` and `pages_user_slug` already allow it.

**Home and builder.** As under [Home and the builder](#home-and-the-builder), with the address card reading `tondo.page/maya/shop`.

**Statistics and publishing.** Per page, with `:id` on each route. The cache key becomes `handle/slug`, and `dropAll(prefix)` is needed, since a handle change or suspension affects every page.

**Sharing.** `trackAs`, click paths, the report link and `shareUrl` all accept `handle/slug`. There's a risk of pages nobody can reach, which M6 handles with a checklist item suggesting a link from the main page.

**Deletion and suspension.** No change. All of a person's pages go together, in both cases.

**Plan limits and price.** As decided: Free 1 and a draft, Pro 10, Team 10 and 25 on its address.

**Teams.** As `teams-implementation.md` has it. `teams.handle` and `users.handle` are two lists of addresses, kept apart by an advisory lock. A team needs a separate plan, so it remains the only way to have a second address, which would be a reason to buy Team that has nothing to do with teamwork.

**Squatting and abuse.** Each account has one name, so this adds no new squatting. `/maya/login` could look official, which the reserved slugs cover.

**Moving a page.** A slug can be renamed, which breaks the old link. A sub-page can't become its own address.

**Size.** 2 to 3 weeks, from the existing plan.

**Against it.** It doesn't do what the owner asked for. Adding own addresses later costs roughly option 2's account work, and M6's public routes stay as extra surface.

## Option 2: Own address per page (recommended)

**What a person sees.** Add a page, build it, choose its address, publish. It sits at `tondo.page/my-band`, beside `tondo.page/maya`, and nothing public connects them. The two are equal: neither is the "main" page, though the oldest has a role on downgrade.

**Addresses and claiming.** The first is claimed at sign-up, as today. Further ones use the same `handleSchema`, `isReservedHandle` and the existing `GET /api/v1/handles/:handle` check, so there's one rule for every address. The unique constraint decides races.

A paid person chooses the address when adding the page. A free draft has no address until it's published, which needs Pro. This follows the point in the notes that a free draft shouldn't hold a name without paying.

**Schema.** No new table.

```diff
 export const users = pgTable("users", {
     id: text("id").primaryKey(),
-    handle: text("handle").notNull().unique(),
     suspendedAt: ...,
     plan: ..., stripeId: ..., endsAt: ...,
 });

 export const pages = pgTable("pages", {
     id: uuid("id").primaryKey().defaultRandom(),
     userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
-    slug: text("slug").notNull().default(""),
+    /** The page's address. Null only on a draft that hasn't been given one. */
+    handle: text("handle").unique(),
     draft: ..., published: ..., updatedAt: ...,
+    /** The oldest page stays editable after a downgrade, and the list keeps its order. */
+    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
 }, (table) => [
-    unique("pages_user_slug").on(table.userId, table.slug),
+    index("pages_user").on(table.userId),
+    check("pages_live_has_address", sql`${table.published} is null or ${table.handle} is not null`),
 ]);
```

```sql
ALTER TABLE pages ADD COLUMN handle text UNIQUE;
ALTER TABLE pages ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
UPDATE pages p SET handle = u.handle FROM users u WHERE p.user_id = u.id AND p.slug = '';
-- A blank page row for each removed:<handle> row keeps those addresses out of use.
ALTER TABLE users DROP COLUMN handle;
ALTER TABLE pages DROP CONSTRAINT pages_user_slug;
ALTER TABLE pages DROP COLUMN slug;
CREATE INDEX pages_user ON pages (user_id);
```

**Derived, with nothing stored:** whether a person still needs the start flow (no pages), the kept page after a downgrade (oldest by `created_at`), and whether a page is live (`published` set). I looked for a way to avoid `created_at`, because ids are random and `updated_at` moves on every save, and I didn't find one. It's the one column here that exists only for ordering.

**Tombstones are the awkward part.** `pages.draft` is required, so keeping a suspended person's addresses out of use after deletion needs a `removed:` user row with one blank page per address. It's a small amount of code, and it's less tidy than today's single row.

**Code that changes.** `grep` finds "handle" in 34 files across `apps/editor`, `apps/server` and the `db`, `contract` and `render` packages, some unrelated, so that's an upper bound on where the work is.

| Area | Change |
|---|---|
| `packages/db/src/accounts.ts` | `claimHandle` inserts into `pages`. `changeHandle` takes a page id. `findHandle` is replaced by a list of pages |
| `packages/db/src/pages.ts` | `findLive` reads `pages.handle` directly, without the slug. `pageOf` replaces `mainPageOf`, as M6 planned. Adds `listPages`, `createPage` and `deletePage`. The last page can't be deleted |
| `packages/contract`, `auth.ts` | `MeResponse.handle` becomes `pages`. `PATCH` on the address names a page |
| `apps/server/src/pages.ts` | Same `:id` routes as M6 |
| `apps/server/src/app.ts` | Almost nothing. `onPublishChange` drops the one page's key, and a plan change or suspension drops each of a person's keys |
| `apps/editor` | `Account.handle` and `pageUrl` follow the chosen page, and backups are keyed by page id. Switcher, as M6 |
| `suspend.ts`, `comp.ts` | Look up the owner through `pages.handle` |
| `packages/page/src/limits.ts` | `pages: 5`, and `isReadOnly` compares with the oldest page instead of checking the slug |

M6's sitemap, tests and `page` reference on links carry over, with slugs left out. No `isValidSlug`, no second reserved list, no `GET /:handle/:slug`, no two-segment redirect and no `dropAll(prefix)`.

**Home and builder.** See [Home and the builder](#home-and-the-builder).

**Statistics.** Each page's own, following the chosen page. `stats` doesn't change, and counts stay with `pages.id` when an address changes.

**Publishing.** Each page publishes alone, with paid checks and step-down per page, as M2 and M4 already work per document.

**Sharing.** Nothing changes per page. A link from one page to another is a plain URL until the optional `page` reference from M6 is built. A pasted URL breaks if that address changes.

**Account deletion.** The confirmation lists every address. Typing the oldest address confirms it, and `removeUser` removes them all through the cascade. Deleting one page frees its address and its statistics, after a separate confirmation.

**Suspension.** Keep `users.suspended_at` as the only level at first, so a suspension takes down all of a person's pages. It adds no column, `suspend.ts <address>` still works, and someone phishing on one address is a reason to distrust the others. The cost is that one bad page also takes the person's other pages down, so appeals matter more. A `pages.suspended_at` can be added later without other changes. See decision 7.

**Plan limits and price.**

| | Free | Pro, $6 | Team member | Team's own |
|---|---|---|---|---|
| Pages | 1 live, plus 1 draft with no address | 5, each with an address, drafts count | 5 | 1, up to 5 at T8 |

I chose 5 because the cases above need 2 or 3, and 5 leaves room. Ten at $6 would make Pro the cheapest way to run client pages, and raising a limit later is easier than lowering one. The $6 stays. I have no evidence on what people would pay more for this, and no case for changing it.

**Downgrade.** As decided, extra pages stay live and read-only, and step down after 30 days. Two rules are new:

- The oldest page stays editable. Someone who would prefer another can't choose it without a further column, see decision 5.
- Taking down a read-only page frees its address at once, with a warning first. Otherwise an unpublished page could hold a name for free forever.

**Teams.** See [What changes in teams](#what-changes-in-teams).

**Squatting and abuse.**

- **Holding names.** A Pro account can hold 5, and after a downgrade it can keep them for as long as the pages stay live. The Terms already allow reclaiming an inactive address, and `stats` could show which have had no visits in 12 months, with no new column. It shouldn't run automatically until an email provider exists to warn people.
- **Unpublished paid pages.** These hold an address too, within the 5.
- **Free accounts.** The limit of 1 doesn't stop anyone making more accounts, because email verification is off today. This is already true, and turning verification on before launch is on `deploy.md`'s list. Option 2 doesn't make it worse.
- **Impersonation.** A paid address has the same reserved list and blocked links. Five names buy five chances at something like `maya-support`, though each needs a paid plan, which makes throwaway use less likely (my reasoning, unmeasured).
- **Rate limits.** Adding, deleting and changing addresses share `allowChange`, so nobody can cycle through names to probe or hold them.

**Moving a page.**

- **Change address:** one update, as today. Old links stop working and someone else can claim the old name, as the Terms say.
- **Swap two addresses:** a person can exchange `/maya` and `/maya-music` in one transaction, using a null value in between. Statistics stay with the content.
- **Give a page to someone else's account:** not in this work. It would be one update, plus moving photos, which per-page folders make easier. I'd wait until someone asks.

**Size.** 3 to 4 weeks. Migration, stores and fake store, 4 to 5 days. Auth, `/me`, start flow and deletion, 2 to 3 days. Routes by page id and editor calls, about a week, shared with M6. Switcher and All pages, 2 to 3 days. Photo folders, 1 day. Tests, 2 to 3 days.

**Against it.** It's the wider change to account code, and addresses get longer for the shop case. Decision 1 in `features.md` and two trade-offs in `data-model.md` need rewriting.

## Option 3: Both

**What a person sees.** Add a page, then choose: "Its own address" or "Under tondo.page/maya". Each page in the list shows which it is. A sub-page has no special behaviour otherwise.

**Addresses and claiming.** Option 2's rules for addresses, and option 1's for slugs.

**Schema.** Option 2, keeping `slug` and adding a parent.

```diff
 pages:
+    handle: text("handle").unique(),
+    parentId: uuid("parent_id").references((): AnyPgColumn => pages.id, { onDelete: "restrict" }),
+    createdAt: ...,
     slug: text("slug"),
 constraints:
+    unique("pages_parent_slug").on(table.parentId, table.slug),
+    check("pages_address", sql`num_nonnulls(handle, parent_id) <= 1`),
+    check("pages_live_has_address", sql`published is null or handle is not null or parent_id is not null`),
```

A sub-page's full address is derived from its parent, so changing `/maya` moves every sub-page with no rewriting. The database can't check that a sub-page has the same owner as its parent, so `createPage` does.

**Home and builder.** The list shows sub-pages indented under their parent. This is the first option where a person needs to understand two kinds of page. The prompt has to explain the difference in a sentence. I'd write: "Its own address has nothing connecting it to your other pages. Under your address keeps your name in the link."

**Statistics, publishing and sharing.** Each page's own, as options 1 and 2, with both route shapes kept.

**Deletion and suspension.** A parent can't be deleted while it has sub-pages. The person deletes or moves them first, and the database refuses otherwise.

**Plan limits and price.** Two limits, as names are scarce and sub-pages aren't. Free 1. Pro 5 addresses and 10 pages in all. `Limits` gains `addresses`. It's harder to explain on the pricing page, and the notes raise the same concern.

**Teams.** As option 2, and team pages can use sub-pages such as `/asterandbell/shop`. That's the closest match to the 25 pages on a team address that `plans.md` promises.

**Squatting and abuse.** As option 2, plus reserved slugs. Being able to use a sub-page instead may mean fewer names are held.

**Moving a page.** A sub-page can become its own address by setting `handle` and clearing `parent_id`, and the reverse. Statistics stay. The old link stops working.

**Size.** 4 to 5 weeks at once. Or option 2 first, then about 1 to 1.5 weeks later, which I recommend if sub-pages are wanted at all. The later step changes no existing rows.

**Against it.** Two ways to do one thing, chosen at a moment when a regular person may not understand the difference. That conflicts with the builder principle of the simplest interface that keeps the power. I don't have evidence that people need both at launch.

## Option 4: A second account

Stan's model. Someone wanting a second page signs up again with another email and pays again.

**What a person sees.** Two logins, two bills, and at first no switcher. Nothing connects the pages, including photo folders and billing, so it's the most complete separation.

**Addresses and claiming.** As today, one per account.

**Schema.** None.

**Home and builder.** Unchanged. A switcher needs a browser holding two sessions. I haven't checked whether Neon Auth supports that, so I can't size it. Without it, a person logs out and in.

**Statistics, publishing and sharing.** Unchanged, and fully independent.

**Deletion and suspension.** Each account alone. Suspending one doesn't reach the other, and Tondo has no way to see that they're the same person.

**Plan limits and price.** $6 per page, with no bundle, as at Stan and Linktree's per-plan rule. It's more income per page, if people accept it. Pro's "more pages" goes away as a selling point, so something else has to fill it.

**Teams.** No change, and each login can be on a team separately.

**Squatting and abuse.** Same as today, since it's already possible.

**Moving a page.** Not possible, apart from changing its address.

**Size.** Up to 2 days to change `plans.md`, pricing and help, plus an unknown amount for a switcher.

**Against it.** It's the least friendly option: a regular person with a band has to manage two emails and two subscriptions. It's worth keeping as the fallback if the others slip, and it's already what someone can do today.

## Home and the builder

Everything here keeps to Porcelain: white page, existing `Card`, `.tag` and `.addr` styles, no new colour and the painted mark doing the only decoration. Copy is sentence case with no em dashes. The mocks for each option are at http://localhost:8107/.scratchpad/multipage/options.html. `.scratchpad/multipage/index.html` is an older prototype that predates this doc and uses the notes' models, so it's a rough reference only.

**The switcher, as the owner proposed.** It sits in the sidebar exactly where Edit page is now, at the same width and position, and shows the chosen page's name and a small swatch of its look. It opens a menu of pages in the order they were made, each with its address and a status dot, with "New page" and a count such as "2 of 5" at the end. The button has a plain border, so it doesn't read as the main action that Edit page's dark fill signals today.

Edit page becomes an icon-only pencil beside the phone preview, outside the phone's frame, with "Edit page" as its accessible name and tooltip. Home's two columns already have a 72 px gap, which holds it. Home stacks below 1240 px wide with the phone still on screen, so the pencil stays beside it down to 761 px.

**On a phone** there's no sidebar. The switcher takes the address's place in the top bar, with the same swatch and name, and opens the same menu. The bottom bar keeps its Edit page item, so there's no pencil.

**With one page on Free,** the control looks the same with one page and "New page" in its menu, so more pages can be found without a prompt. Pressing "New page" at the limit opens the prompt under "On Free" below, once. On Pro at 5 pages, "New page" explains the limit and offers to delete a page.

**What this changes elsewhere.**

- Analytics and Page settings follow the chosen page, and Account doesn't. `nav.ts` doesn't change, so items don't move, which is its rule.
- The sidebar's Edit page is on every dashboard page today, and I found no other link to the builder on Analytics or Account. Those pages have no phone, so each needs its own Edit page button in its header, or people have to return to Home first.
- A pencil with no word is easier to miss than a labelled button, and Edit page is the main thing a new person needs. I haven't tested this. If it proves hard to find, the pencil can gain its label on a first visit, or a person's first page can open in the builder, as the start flow leads there.
- All pages isn't in this menu, because 5 pages fit in it. It can wait unless the limit goes up.
- E2e tests that press the sidebar's Edit page will need changing.

The current page sits in the URL as `?page=<id>`, as M6 proposed, so a shared tab or a refresh stays on the right one. With no id, it opens the page edited last, which `updated_at` already gives. Before switching, `savePendingWork` saves anything still in the browser, as Home already does.

**Other switcher designs.** The page also shows two I considered earlier. A card above Edit page shows the address and keeps Edit page in the sidebar, at the cost of one more block above the nav. A rail of painted circles makes switching one press, and adds a column most people won't use. I'd take the owner's design, with the header buttons above.

**Home with several pages.** It's today's Home for the chosen page: status tag, address with copy and share, checklist, Help me, 30-day numbers, phone preview. Three small changes:

- The greeting says "Hello, The Low Notes" today, because it reads `header.name` from the page. With several pages it should use the person's own name from `nameOf`.
- A line under the address names the other pages only when one needs attention, such as "2 other pages have unpublished changes." It links to that page.
- The notices about plans belong to the page they describe.

**All pages, if the limit goes up.** A plain list with no nav item, one row per page: painted circle, name, address, status tag, 30-day views, Open, Edit. This is where a person sees everything at once, and it's the one place with a combined view. Totals across pages can wait.

**Adding a page.**

1. "New page" asks for a name, and on a paid plan an address, checked as they type using the existing route.
2. The new page starts from a choice of "Start from a look" or "Copy one of my pages". Starting blank is the default, because a separate page shouldn't inherit a look by accident. M6's rule of copying the main page's look fits sub-pages and doesn't fit here.
3. The builder opens on the new page.

**On Free.** The prompt appears once, with two equal buttons, and doesn't repeat:

> A second page can go live with Pro, for $6 a month, and gets its own address. You can build it now and choose the address when you publish. If you only need a few more sections on your page, you don't need this.

Buttons: "Build it" and "See Pro". A third page says: "You have a draft page already. Remove it to start another, or get Pro for 5 pages."

**In the builder.** The top bar shows the page's name and address, so someone working on two pages in two tabs can tell which is which. `TopBar` gets a small switcher on the address, which saves first and doesn't reload more than it needs to. Publishing says the address: "Publish to tondo.page/my-band". The undo history stays with the page and clears on switching, since it lives in the browser.

**Page settings** gains: this page's address, Change address, Copy this page and Delete this page. **Account** keeps the plan, email and deleting everything.

## What changes in `plans.md` and the milestones

Whichever option is chosen, **M1 to M5 can carry on.** A few things they're writing will need small changes in M6: `pages: 10` in `limits.ts`, `isReadOnly`'s check on slug, `setPlan` returning one handle so one cache key can be dropped, and `comp.ts` and `seedUser` reading `users.handle`. The pricing page hasn't promised "10 pages" as available, since that comes off "Coming" only in M7, so nothing public is wrong yet.

| | Option 1 | Option 2 | Option 3 | Option 4 |
|---|---|---|---|---|
| `plans.md`, `plans-implementation.md` | No change | Pro 5. New prompts. Rewrite "Pages per person", M6, and the downgrade row | Pro 5 and 10. Two limits | Remove pages from Pro, and look again at what Pro sells |
| M6 | As written, 2 to 3 weeks | Replaced, 3 to 4 weeks | Replaced, 4 to 5 weeks | Dropped, up to 2 days |
| Time to charging | About 7 weeks | About 8 weeks | About 9 weeks | About 5 weeks |
| `features.md` decision 1, `data-model.md` trade-offs | No change | Rewritten: a page has an address | Rewritten | No change |
| `features.md` phase 4, tab links | `/maya/shop` is taken by sub-pages, so tab links need another form | Free to use `/maya/shop` | Conflict to settle, as in option 1 | Free to use |
| `features.md` phase 5, many profiles | Still open | Done for people | Done for people | Still open |
| Terms, on changing an address | No change | Applies per page | Applies per page | No change |
| `AGENTS.md`, site copy saying "one address" | No change | Reads fine for Free. Pro copy changes | Same | No change |

Charging can still go first under any option, if decision 5 in `plans-implementation.md` is reversed and Pro launches without more pages. I wouldn't, as more pages is meant to be one of Pro's main reasons.

**Tab links under option 2.** `tabs.ts` already renders radio buttons with no script, with the first tab checked. A route of `GET /:handle/:tab` that marks a different one as checked keeps pages free of JavaScript. It's about 2 to 3 days and it's separate work, on Pro as tabs are. It covers the shop and links case with one page and one look, so I'd build it after option 2 and before considering sub-pages.

## What changes in teams

**Option 1 and option 4:** nothing changes from `teams-implementation.md`.

**Options 2 and 3: teams gets simpler, and it keeps its table.** A team still needs an owner, a plan and a Stripe id, so `teams` stays. Its handle moves to its page.

| In `teams-implementation.md` | With `pages.handle` |
|---|---|
| `users.handle` and `teams.handle`, no constraint across them | One unique column, so the database guarantees it |
| New `handles.ts`, advisory lock, a check across two tables on every write | Removed. The T1 cost of 2 to 3 days falls to about 1 |
| `PATCH /api/v1/me/team` to change a team's address | The same route as any page's address. Owner check comes from `editableBy` |
| `pages_team_slug` | Removed |
| Team address is "the page's address, stored elsewhere" | A team address is just another address |
| Tombstones in two tables | One way |
| T8, 25 team pages and a switcher, 2 to 3 days | About 1 day. Team pages are pages, and the switcher is built |
| Moving a person's page to a team | Not offered. Becomes one update, so a band's page could become a team's page later with its address and statistics |

**Three things it makes harder, and one is a real problem.**

1. **Which of a member's pages takes the team's look?** The plan says every page they have. That's wrong once pages are separate: a clinic joining shouldn't restyle Maya's band page. I propose only one page joins, chosen at acceptance, defaulting to the oldest. It can be stored with no new column by letting `pages.team_id` be set on a member's page, while their `user_id` stays. `pages_one_owner` becomes `num_nonnulls(user_id, team_id) >= 1`, where a row with `user_id` is theirs to edit and one without it is the team's. `onDelete: "cascade"` on `pages.team_id` has to change, because deleting a team would otherwise delete members' pages, so `deleteTeam` clears those first. Team totals sum over `pages.team_id`.
2. **Which page holds the team's look, if a team has several?** The oldest, by `created_at`, which needs the same protection against deletion as M6's main page.
3. **25 team pages no longer fits** under option 2. A team with 25 addresses holds a lot of names, and `/teams` doesn't promise this today. I'd make it 5, or 1 until someone asks. Under option 3 it can stay at 25 sub-pages.

**Pro against Team.** One person with 5 client pages pays $6 on Pro, against at least $12 on Team, which needs 3 people. Team still has what Pro doesn't: several logins, a shared look, invitations and team statistics. An agency that hands logins to clients has to use Team, or give each client their own account. I'm comfortable with this, and a limit of 5 keeps it contained. If it becomes common, the answer is to lower the limit for new plans or add a paid pack, as Liinks sells.

## Comparison across the rest

| | 1: Sub-pages | 2: Own address | 3: Both | 4: Second account |
|---|---|---|---|---|
| Nothing publicly connects pages | No | Yes, once photo folders change | Yes for own addresses | Yes |
| Concepts to explain | One | One | Two | None, though it's more to manage |
| Public route changes | New two-part routes | None | New two-part routes | None |
| Page editing routes by id | Yes | Yes | Yes | No |
| Lock for team addresses | Yes | No | No | Yes |
| Moving to another address | Rename only, under one name | Change or swap | Change, swap, promote or demote | Change |
| Names one paying person holds | 1 | 5 | 5 | 1 per plan |
| Risk of pages nobody can reach | Higher | Lower, since each is shared on its own | Mixed | Lower |
| Change later to add the others | Option 2's account work | About 1 to 1.5 weeks for sub-pages | None | Most of option 2 |

## What would change my mind

- **People mostly want pages under their own name.** If the owner, or the first private release people, mostly describe campaigns and services under one name, option 1 with tab links could be enough, and separate addresses could wait. The owner's brief points the other way, so I've weighted that.
- **Tab links prove not to be enough** because a shop needs its own look. Then I'd add sub-pages, as option 3's later step.
- **Old addresses have to keep working.** If a changed address should redirect for a while, or addresses have to be held with no page, a `handles` table becomes the better home, and the table count goes up by one.
- **Team needs many pages under one team name** as a launch promise. Then I'd build option 3 at once.
- **Agencies take up Pro in numbers.** Then 5 is too many at $6.
- **Testing in M3 shows Free feels mean.** That would loosen what the free draft and the prompt do, and doesn't change the model.

## Decisions

**The owner's choices:**

- **1. Which option?** Option 2, own address per page. My earlier suggestion of tab links next and sub-pages only on real requests is under decision 11.
- **3. How many pages on Pro?** 5.
- **12. Do old addresses redirect?** No, as the Terms say today, with a warning when changing one.
- **13. Should this replace M6, before charging?** Yes, as work after M5.

**Working defaults, not yet the owner's choices.** The plan follows these unless they change:

- **2. My reading of "totally separate".** Own address, look, publishing, statistics and share link, with nothing public connecting them, and one login, bill and photo allowance.
- **4. The free draft.** One unpublished draft on Free with no address, choosing it at publish.
- **5. Which page stays editable after a downgrade?** The oldest, using `created_at`. Letting someone choose needs one more column.
- **6. What happens to a name after a downgrade?** Taking down a read-only page frees its address at once, with a warning. Reclaiming inactive addresses waits for an email provider.
- **7. Suspend a person or a page?** A person, so all their pages go, using the column that exists.
- **8. Photo folders.** One folder per page, with one shared allowance and picker. With no users, there's nothing to move. The owner said this can simply be how photos work.
- **9. Which of a member's pages joins a team?** One, chosen on accepting, defaulting to the oldest. This overrides "every page" in `teams-implementation.md`.
- **10. How many pages does a team's own side get?** 1 until T8, then 5, in place of 25.
- **11. Does `/maya/shop` belong to tab links or sub-pages?** Tab links, since they need no new kind of page.
- **14. What do new pages start from?** A choice of look or a copy of an existing page, with no inherited look.

## What I couldn't confirm

- **Demand.** Nobody has been asked. The cases come from the owner's brief, and competitors' choices only show what they sell.
- **Inside competitors' products.** I didn't sign up for any. How Beacons addresses a sub-page, whether Liinks profiles have their own usernames, what a Carrd site's address is and whether Linktree limits free Linktrees aren't stated on the pages I could read.
- **Sources I couldn't read directly.** Later's help returned 403 and Beacons' manager article returned 404, so those rest on search summaries. Linktree's prices come from a third-party capture. Lnk.Bio's single-account plans weren't checked.
- **Neon Auth multi-session.** I didn't check whether option 4's switcher is possible.
- **The migration and code changes.** The SQL hasn't been run, and sizes are estimates. The working tree is changing, so counts and file details will move.
- **The photo folder leak.** I read this from the code and didn't load a real page to see it.
- **Price.** I have no evidence on whether 5 pages at $6 is right, or how it affects how many people pay.
