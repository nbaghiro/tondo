# Plans implementation plan

**Current, built on 2026-11-01 against the stand-in. This replaces the rules below wherever they differ.** See the top of [plans.md](plans.md) for what was decided. It stays off until `PLANS_ON`, there's no Stripe account yet, and none of this has run against real Stripe.

| What | How it's built |
|---|---|
| Unsubscribed | `PLANS.free` isn't sold. It's 1 page, 0 live, 25 photos and 15 Help me credits in total, kept on one `usage` row with the month `total` |
| Starter | 1 page and 1 live, $5 a month or $48 a year |
| Pro | Per pack: `proLimits(packs)` gives 5 pages, 5 live and 300 credits a pack, up to 20 packs. Photos stay 2,000. $12 a month or $120 a year a pack |
| Packs | `users.packs`, copied from the Stripe subscription's quantity on the one Pro Price for each period. Migration `0008` |
| Changing packs | `POST /api/v1/me/billing/packs`, from Account and the New page prompt, through Stripe's confirm page, which charges or credits |
| Trial | 14 days, with `trial_period_days` and a card required at Checkout. A customer's first subscription only, which Stripe's list tells us, so there's no column |
| When it starts | When the subscription starts, which is normally at first publish. Someone who subscribes from Account starts it then |
| Trial ending or cancelling | The subscription ends, `ends_at` is set, and pages go offline as they would for any lapsed plan |
| Limits on screen | New page on Starter or with no plan offers Pro. Over Pro's pages offers 5 more. Interface copy doesn't say "pack" |
| Badge | "Made with Tondo" on every live page. `page.hideBadge`, from a switch in Page settings, leaves it off from the next publish. Only subscribers have live pages, so it needs no further check |
| Prices | `limits.ts`, and the boot check compares Stripe's Prices with them |
| Site | Two cards with a monthly and yearly switch, and "Try free for 14 days" going to sign-up. "Your own domain" is listed and **isn't built**: it has to be before launch |

**The owner must create in Stripe:** Prices with the lookup keys `starter_month` at $5, `starter_year` at $48, `pro_month` at $12 and `pro_year` at $120, with a portal configuration that allows quantity changes on Pro.


This plan builds the plan the owner chose in [plans.md](plans.md).

**Status:** the simplified plans decided on 2026-11-01 are built, off until `PLANS_ON`, and tested against a stand-in for Stripe. `PLANS_ON` is true only in tests. The real pass in a Stripe sandbox hasn't been done, because it needs the owner's account. [Current plans](#current-plans) below is what the code does. Everything after that section is the earlier plan (option A), kept as history, and much of it no longer applies.

## Current plans

| | Free | Starter, $4 a month or $40 a year | Pro, $10 a month or $100 a year |
|---|---|---|---|
| Pages that can be built (`pages`) | 1 | 5 | 5 |
| Live pages (`live`) | 0 | 1 | 5 |
| Help me credits a month | 15 | 100 | 300 |
| Photos | 25 | 2,000 | 2,000 |
| Team features | No | No | Part of the plan, once built |

Every plan has all looks, colours, fonts, backgrounds, kinds of section, scheduling, all statistics ranges and no section limit. Nothing draws a Tondo mark.

**How it works now**

- `packages/page/src/limits.ts` holds the numbers. `canAddPage` reads `pages`, and `canPublishPage` reads `live`. Starter's 5 buildable pages is my choice: the brief asks for an offer of Pro on a second page, and that needs a Starter person to be able to have one.
- Publishing past `live` is refused with a 422 and a publish issue whose `plan` says what to offer: `any` on Free, `pro` on Starter, and nothing on Pro, which only says to take a page down. The editor shows the prompt from that issue, so the server stays the only judge.
- The prompt offers monthly or yearly up front. Starter moving to Pro goes through Stripe's portal confirm page (`changeUrl`, `subscription_update_confirm`), because Checkout would start a second subscription.
- **Which pages visitors see** is derived, with no column. A person's live pages count oldest first, and those within `live` are served. So a lapsed plan serves none, and someone who moves from Pro to Starter keeps their oldest live page online. Taking that one down brings the next one back online. `published` is never changed by a plan.
- **Stopping paying.** `past_due` still counts as paid, so a page stays up through Stripe's retries. When the subscription ends, `ends_at` is set, `limitsFor` returns Free's limits at that moment, and the page goes offline. Subscribing again clears `ends_at`, and the page comes back with no further step.
- **An address with no live page** answers 404 with one plain page, `apps/server/src/no-page.ts`: "There's no page here right now", with a link to log in. It reads the same for an address nobody holds, a page not published yet, a lapsed plan, one past the plan's number, and a suspended person, so it says nothing about whose address it is. Link redirects on those pages answer 404 and nothing is counted.
- `PLANS_ON=false` gives everyone Pro's limits, with credits at Free's number. `TONDO_PLAN=pro` still raises the credits locally.
- Seat limit of 10 and shared credits are recorded in [teams-implementation.md](teams-implementation.md), and aren't built.

**Removed:** `paid-uses.ts`, `step-down.ts`, free look lists and `isFreeLook`, `PAID_BLOCKS`, the design and business flags, section limits, `statsDays` and its clamp, the mark in the renderer, live step-down, publishing with free choices and its preview, Pro labels and first-time notes, `PlanLab`, grace days, `designUntil`, `TEAM_MINIMUM`, `team` as a plan, and the tests for all of them.

**Migration:** `0006_flat_pro_plan` renames any stored `team` plan to `pro`. No column was dropped, since `plan`, `stripe_id` and `ends_at` are all still used.

**What the owner must create in Stripe**

1. Two Products, Tondo Starter and Tondo Pro, each with a monthly and a yearly Price, tax behaviour `exclusive`, and these lookup keys: `starter_month` ($4), `starter_year` ($40), `pro_month` ($10), `pro_year` ($100). The server won't start with `PLANS_ON=true` unless all four exist and match `PRICES`.
2. A restricted key and a webhook endpoint at `/api/stripe/webhook`, for `STRIPE_KEY` and `STRIPE_WEBHOOK_SECRET`.
3. A customer portal configuration with cards, invoices, cancelling at the period end, and subscription updates allowed between all four Prices. The Starter to Pro move depends on that setting. I've only run it against the stand-in.
4. Under failed payments, retries ending with the subscription cancelled. Pages stay up until the subscription ends, so this setting decides how long that is. If retries end in `unpaid` instead, the sync also takes the page offline, on that date.
5. The earlier steps under [What the owner must do](#what-the-owner-must-do) still apply for tax and the business, apart from the `pro_month` and `pro_year` amounts and any `team` Price.

**Testing.** Unit tests cover the limits, offline serving, ranks, the sync and checkout. `tests/plans.spec.ts` drives the prompt, paying, cancelling, moving from Starter to Pro, failing payments, lapsing and restoring against `tests/stripe-stand-in.ts`. The stand-in has all four Prices, and a page standing in for the portal's confirm step. The real sandbox pass below still has to be done, and needs to cover the portal's confirm page.

**Decided in this work and open to change:** a page past the plan's number goes offline rather than staying up, with the oldest kept, because the brief didn't cover downgrades between paid plans. Unused free addresses aren't released, which `plans.md` suggests doing later.

**Marketing and the code differ on purpose.** At the owner's request, the marketing site states paid plans and team features as available at launch, and it isn't deployed. It can't go live until they are. See `cleanup-log.md`.

The rest of this file is the earlier plan.

It was first checked against the working tree and Stripe's docs on 2026-11-01, while other agents were changing `apps/` and `.docs/`, so recheck line-level details when a milestone starts. All sizes are my estimates for one developer. I haven't tried any of this against a real Stripe account.

## What's being built

| | Free | Pro, $6 a month or $60 a year | Team, $4 a person from 3 people |
|---|---|---|---|
| Pages | 1, plus 1 unpublished draft | 5, each with its own address | See [multi-page-implementation.md](multi-page-implementation.md) |
| Looks | 12 | All 50 | All 50 |
| Colours and fonts | Each look's own, plain white, dark | Also your own colour, a colour from your photo and 8 font pairings | Same as Pro |
| Background | Look's art, Paint it again, solid, soft fade | Also a photo | Same as Pro |
| Sections | 14 kinds, 6 on a page | All kinds, no plan limit | Same as Pro |
| Scheduling a section | Try only | Yes | Yes |
| Photos | 25 | 2,000 | 2,000 a person |
| Statistics | 7 days | 7, 30 and 90 days | Same as Pro |
| Tondo mark | Shown | None | None |

Anything paid can be tried in the editor, and payment is asked for at publish. A plan ending never takes a page offline: the address and content stay, the mark returns at once, and the design steps down 30 days later.

## Decisions taken from plans.md

These are the doc's own defaults, numbered as in its decision list. The ones that need the owner are under [Decisions still open](#decisions-still-open).

| # | Question | Taken as |
|---|---|---|
| 1 | Which option | A, chosen by the owner |
| 2 | The 12 free looks | As listed: Madder, Sap, Sumi, Lagoon, Lilac, Office, Indigo, Dusk, Fern, Volt, Signal, Tide. Rechecked in QA |
| 3 | Own colour on Free | Gated, as the owner's summary says |
| 4 | Statistics on Free | 7 days |
| 5 | Pro launches with multiple pages | Yes, each with its own address, not sub-pages. Charging opens in M7, after that ships |
| 6 | Downgrade rule | As decided, and stated publicly |
| 7 | Private release | 12 months of Pro free, then the normal rules |
| 9 | Refund or trial | 14-day refund on request and no trial |
| 10 | Pixels | None on any plan. Referring sites are left out of this work, since they need a privacy policy change |
| 12 | Custom domains | Out of scope. They stay marked Coming, so the hosting choice can wait |

Where this plan differs from the sketch in `plans.md`:

- **`ends_at` replaces `design_until`.** The sketch stored the end of the 30 days. Storing when the plan ends lets the 30 live in code, and the same column also covers private release accounts.
- **The limits module moves to `packages/page`.** The editor, server and pricing page all need the numbers, and `packages/page` is the only package all three can import.
- **`Limits` has no contacts, domain or CSV fields,** because none of those exist yet and the rule is no field until it's used.
- **"A free look chosen in advance" needs no storage.** Publishing a free look before the 30 days end is the choice. Otherwise the nearest look applies.
- **Scheduled sections are left off "Publish with free choices".** Removing only the schedule could bring back a sale that had already ended.
- **The webhook isn't the only way a paid plan arrives.** The return from Checkout runs the same sync as the webhook, so a late webhook can't strand someone who has just paid. The webhook remains the source for everything after that.

## Data

`pages` and `stats` don't change here. This is one migration, generated by `pnpm db:generate` in M1. Own addresses bring a later migration of their own, in [multi-page-implementation.md](multi-page-implementation.md).

```sql
ALTER TABLE users ADD COLUMN plan text NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN stripe_id text UNIQUE;
ALTER TABLE users ADD COLUMN ends_at timestamptz;
```

```ts
// packages/db/src/schema.ts, added to users
plan: text("plan").$type<Plan>().notNull().default("free"),
stripeId: text("stripe_id").unique(),
/** When the plan stops, or stopped. Null means it carries on. */
endsAt: timestamp("ends_at", { withTimezone: true }),
```

| Column | Why it's needed | Why it can't be derived |
|---|---|---|
| `plan` | The last plan this person had | Asking Stripe on every page view would be too slow, as `data-model.md` says |
| `stripe_id` | Finds the person from a Stripe event | Stripe's id exists nowhere else on our side |
| `ends_at` | Works out the mark, the limits and the 30 days | The instant has to be local for the same reason as `plan` |

### What's derived

| Value | How |
|---|---|
| The plan in effect | `plan`, unless `ends_at` has passed, in which case Free |
| Keeping the paid design | `ends_at` passed, less than `GRACE_DAYS` (30) ago, and `plan` isn't `free` |
| The step-down date | `ends_at` plus 30 days. It's a calculation on each read, so no job runs and no page is rewritten |
| Read-only extra pages | One page allowed, a non-empty slug and a live copy |
| Renewal date, monthly or yearly, cancelling or not | Read from Stripe when the Account page opens, since nothing else needs it |
| Private release | `plan = 'pro'` with `ends_at` 12 months ahead. The 30 days then apply with no extra code |

| State | `plan` | `ends_at` | In effect |
|---|---|---|---|
| Never paid | `free` | null | Free |
| Paying, or `past_due` while Stripe retries | `pro` | null | Pro |
| Cancelled, still in the paid period | `pro` | null | Pro. Stripe keeps the status `active` until the period ends |
| Ended 10 days ago | `pro` | past | Free limits and the mark, with the paid design kept |
| Ended 31 days ago | `pro` | past | Free, with the design stepped down when read |
| Private release | `pro` | future | Pro |

The stored `published` document is never changed by a downgrade, so paying again restores the page at once.

### Store changes

- `packages/db/src/accounts.ts`: add `findPlan(userId)`, `setStripeId(userId, id)` (only where it's null) and `setPlan(stripeId, { plan, endsAt })`, which returns the handle so the cache can be dropped. `removeUser` is unchanged, and its `removed:` tombstone gets the column defaults.
- `packages/db/src/pages.ts`: `Draft` and `LivePage` gain `plan` and `endsAt`, because both queries already join `users`. `publish` takes an optional page to store, for "Publish with free choices".
- `packages/db/src/pages.ts`: `seedUser` writes `plan: 'pro'`, so seeded example pages have no mark.
- `packages/db/src/comp.ts`: new, in the style of `suspend.ts`. `pnpm --filter @tondo/db comp <address> [--months 12]` or `--all`. It skips anyone with a `stripe_id`.
- `apps/server/src/fake-store.ts`: the same fields, so route tests need no database.

Update the Tables section of `data-model.md` in M1.

## The limits module

`packages/page/src/limits.ts` is the only file that knows plans. This is what `features.md` decision 6 asks for, and it stays free of Node and DOM types, as `AGENTS.md` requires.

```ts
export type Plan = "free" | "pro" | "team";
export const GRACE_DAYS = 30;
export const PRICES = { pro: { month: 6, year: 60 }, team: { month: 4 } } as const;
export const TEAM_MINIMUM = 3;

export interface Limits {
    /** Live pages, including the main page. */
    pages: number;
    /** Unpublished pages allowed on top, to try the idea before paying. */
    drafts: number;
    /** Null means no limit beyond the schema's. */
    sections: number | null;
    photos: number;
    statsDays: number;
    design: boolean; // all looks, own colour, font pairings, photo background
    business: boolean; // Shop, Services, Bookings, Team, Tabs, scheduling
    mark: boolean;
}

export const PLANS: Record<Plan, Limits> = {
    free: { pages: 1, drafts: 1, sections: 6, photos: 25, statsDays: 7, design: false, business: false, mark: true },
    pro: { pages: 5, drafts: 0, sections: null, photos: 2000, statsDays: 90, design: true, business: true, mark: false },
    team: { pages: 5, drafts: 0, sections: null, photos: 2000, statsDays: 90, design: true, business: true, mark: false },
};

export const FREE_LOOKS = ["madder", "sap", "sumi", "lagoon", "lilac", "office", "indigo", "dusk", "fern", "volt", "signal", "tide"] as const;
export const PAID_BLOCKS = ["products", "services", "booking", "team", "tabs"] as const;

export function limitsFor(account: { plan: Plan; endsAt: Date | null }, now: Date): Limits & { designUntil: Date | null };
export const canAddPage: (limits: Limits, total: number) => boolean;
export const canPublishPage: (limits: Limits, live: number, isLive: boolean) => boolean;
export const isReadOnly: (limits: Limits, page: { slug: string; published: boolean }) => boolean;
```

Next to it, each its own concept:

- `packages/page/src/paid-uses.ts`: `paidUses(page, limits, livePage)` returns `{ code, target, label }[]`. The codes are `look`, `colour`, `font`, `background`, `section`, `schedule` and `too_many`. It works on `liveContent(page).page` without hidden blocks, so a Shop still showing sample words doesn't ask for payment. A block whose id is already on the live page doesn't count, which is how a downgraded person keeps editing their Shop.
- `packages/page/src/step-down.ts`: `FREE_LOOK_FOR`, and `stepDown(page, { keepContent, live })`. It sets a free look, and removes `style.colour` where the mode is `brand` or `photo` or the look changed, `style.font`, and `style.bg` when it's `photo`, along with `bgPhoto`. With `keepContent: false` it also leaves off paid blocks, scheduled blocks and sections past the sixth, unless they're already live.

`apps/server/src/limits.ts` shrinks to the request side: it reads `PLANS_ON`, and `limitsOf(account)` calls `limitsFor`, or treats everyone as Pro when the flag is off. The phishing code in that file moves to `apps/server/src/blocked.ts`, with its test, since it's a different concept and is the only reason the name would stay confusing.

### Looks split

`FREE_LOOKS` is above. `FREE_LOOK_FOR` is a `Record<PaidLook, FreeLook>`, so a new look won't compile until it's assigned. This is my first pass, made from the groups in `plans.md` without viewing the pairs side by side. M2 checks each pair on a screenshot and adjusts.

| Goes to | From |
|---|---|
| Sumi | atelier, vellum, plaster, ink |
| Dusk | noir, nix |
| Lagoon | brine, smile, surf |
| Indigo | press, keys, second |
| Office | counsel, estate, ledger, postal |
| Lilac | calm, lume, wax, bloom |
| Sap | bake, roast, shelf, crumb, biscuit |
| Fern | harvest, trail |
| Signal | comet, cutout, riso, pixel, conf |
| Volt | rivet, rave |
| Madder | scrap |
| Tide | glass, rovers, stacks |

Internal names differ from labels in a few cases: bake is Bakehouse, conf is Ticket, counsel is Letterhead, glass is Rose window, nix is Lacquer, scrap is Scrapbook and second is Second Street.

### Section kinds

Today's code has 23 section definitions. The 14 free kinds are `links`, `spotlight`, `banner`, `photos`, `about`, `events`, `media`, `proof`, `questions`, `find`, `story`, `posts`, `space` and `title`. The 5 paid are `shop`, `services`, `bookings`, `team` and `tabs`. The other 4, `touch`, `download`, `tip` and `embed`, are held and can't go live, so they have no plan yet. A test counts available kinds on each side, so making a held kind available fails until someone assigns it.

### Every enforcement point

The server decides. The editor only displays the same answers from the same module.

| Where | Check | Refusal |
|---|---|---|
| `photos.ts`, `POST` | `limits.photos` against the stored count | 413, `plan_limit` |
| `pages.ts`, `publishCheck` and `publish` | `planIssues` from `paidUses`, called where `serverIssues` calls it today | 422 with issues marked `plan` |
| `pages.ts`, `publish` with `free: true` | Stores `stepDown(draft, { keepContent: false, live })`, after running `publishIssues` and `blockedIssues` on that copy. Asserts `paidUses` is empty | |
| `pages.ts`, `stats` | The asked range clamps to `limits.statsDays`, and the answer says which range it used | No refusal |
| `app.ts`, `/:handle`, `/:handle/:slug` | Mark, and `stepDown(page, { keepContent: true })` when design isn't kept. Worked out on each request from the cached plan and `ends_at`, so the date is exact | |
| `pages.ts`, `POST /me/pages` (own pages) | `canAddPage` | 403, `plan_limit` |
| `pages.ts`, publish another page (own pages) | `canPublishPage` | 422 |
| `pages.ts`, save another page (own pages) | `isReadOnly`. Unpublishing and deleting stay allowed | 403, `plan_limit` |
| `auth.ts`, `GET /me` and both other `MeResponse` routes | Returns `plan`, `limits`, `designUntil` and `billing` through one helper | |
| `billing.ts`, `checkout` | Refuses when a paid subscription exists, and offers the portal | 409 |

Saving a draft is deliberately unchecked, and `operations.ts` stays free of plan rules, so the editor and the AI chat proposal share the same operations. Trying a paid look can't reach visitors, because publish is the only route to `published`.

The editor reads the same data for `LookTiles`, `MakeItYours`, `AddList`, the section schedule, `PublishPanel`, `AnalyticsPage`, the photo picker in `Fields.tsx`, and Home.

Contract changes in `packages/contract/src/index.ts`, all in M1 so later milestones don't collide:

- `errorResponse` gains an optional `code`.
- `meResponse` gains `plan`, `limits`, `designUntil` and `billing`.
- Issues gain an optional `plan` code. `PublishIssue` in `packages/page/src/publish.ts` gains the same.
- `publishRequest` gains an optional `free`.
- `statsResponse` gains `range`.
- `routes` gains the billing routes and a photo delete.

### Photo removal

`photos.ts` has no delete route, so someone who replaced a photo a few times would be stuck at 25. Add `DELETE /api/v1/me/photos/:file` in M1, with the JSON and same-origin checks the other routes use. It only accepts names in the person's own folder that match `UPLOAD_KEY`. A photo in use on a draft or live page returns 409 with "This photo is on your page. Take it off first.", using `photosIn` exported from `packages/page/src/publish.ts`. The picker in `apps/editor/src/components/Fields.tsx` gains a remove control and a count.

## Trying and paying

### Labels

A small text label reading "Pro" in `apps/editor/src/components/Parts.tsx`, drawn beside the item, with "part of Pro" in the accessible name. It isn't a padlock, because the item works. There's no dimming, and none of it shows once someone has Pro or while `billing` is false.

| Where | Change |
|---|---|
| `LookTiles` in `LookPanel.tsx`, also in `StartFlow.tsx` | Label on 38 tiles. Free looks come first under All, within the existing mix |
| `MakeItYours` in `LookPanel.tsx` | Label on My colour, From my photo, the 8 pairings and A photo |
| `AddList` in `Panels.tsx` | Label on Shop, Services, Bookings, Team and Tabs |
| Schedule in `SectionPanel.tsx` | Label beside Show from and Show until |
| `AnalyticsPage.tsx` | 30 and 90 stay visible with a label. On Free they show the note below without a request. The default range becomes the smaller of 30 and `statsDays` |
| Home and `PublishPanel.tsx` | "In the last 30 days" reads the `range` from the answer, or Free would show a wrong sentence |
| `Shell.tsx` | One quiet line above Help, "Free plan" or "Pro". On a phone it sits in More. `nav.ts` gets no new item |

### Publish flow

1. The person presses Publish. The editor flushes the save as it does today, and `PublishPanel.tsx` gains a `plan` view when `paidUses` has anything. Ordinary issues are still listed first.
2. The panel lists what's paid, with two buttons of equal weight: "Get Pro, $6 a month" with a small "or $60 a year" beside it, and "Publish with free choices".
3. **Free choices** opens `Preview.tsx` with `stepDown` applied, and a list of what changes. "Publish this" sends `free: true`. The draft stays as it is.
4. **Get Pro** posts to the checkout route and gets a URL back as JSON, then goes there with `location.assign`. This stays within `APP_POLICY`, because `form-action` isn't involved.
5. Stripe returns to `/app/edit?paid=1`. The editor calls the sync route and then reads `/me`. If the plan changed, the panel opens with one Publish button. It doesn't publish for them, because they may want to look first, and a page going live should be their own press.
6. If the plan hasn't changed after about 30 seconds, it shows the message below and the person keeps editing. Cancelling at Stripe returns to `/app/edit` with the panel open and nothing lost.
7. If Checkout can't be opened, the panel says so and still offers free choices, so publishing is never a dead end.

Home's "Live, with unpublished changes" compares the draft's `stepDown` with `published`, so someone who chose free choices is told their draft has Pro choices, and isn't told they have unfinished work.

### Copy

Following `design-language.md` and `plans.md`. The prompt appears once per item per visit, and never with a countdown.

| Moment | Copy |
|---|---|
| Pro look picked | Bakehouse is part of Pro. Try it as long as you like, and you'll be asked when you publish. |
| Own colour, font or photo background | Your own colour is part of Pro. Try it as long as you like, and you'll be asked when you publish. |
| Shop, Services, Team or Tabs added | Shop is part of Pro. You can build it now and decide when you publish. |
| Bookings or Shop, extra line | A plain button can link there for free. |
| Schedule set | Scheduling is part of Pro. It works here, and you'll be asked when you publish. |
| Seventh section | Free pages go live with up to 6 sections. |
| Publish panel | Your page uses Bakehouse, your own colour and Shop, which are part of Pro. |
| Free choices preview | This is what would go live. Your draft keeps everything, so nothing is lost. |
| 26th photo | You've used your 25 photos. Remove one, or get 2,000 with Pro. |
| Analytics, 30 or 90 days | You can see 7 days on Free. Your views are still being counted, so older days will be here if you get Pro. |
| Page settings, mark | Free pages show a small Made with Tondo. Pro removes it. |
| Second and third page | See the copy table in [multi-page-implementation.md](multi-page-implementation.md) |
| After paying | You're on Pro. Your page is ready to publish. |
| Payment still updating | Your payment went through and your plan is still updating. Keep working, and it'll appear here shortly. |
| Checkout unavailable | We couldn't open the payment page. Please try again, or publish with free choices for now. |
| Payment failing | Your last payment didn't go through. Your plan and page are unchanged while we retry. Update your card in Manage billing. |
| Plan ended, Home | Your plan has ended, and your page is still live. It keeps Bakehouse until 3 December, then moves to Sumi. You can choose another free look before then, or get Pro again. |
| After the step-down, Home | Your page now uses Sumi. Your draft still has everything, so getting Pro brings it back. |
| Extra page after a downgrade | See the copy table in [multi-page-implementation.md](multi-page-implementation.md) |
| Private release, Account | You have Pro for free until 1 November 2027. |
| Delete account, with a plan | This also cancels your plan straight away, with no further charges. |

## Stripe

Checked with the `stripe:stripe-best-practices` skill and `stripe docs` on 2026-11-01. The skill lists API version `2026-09-30.endive` and Node SDK 23.0.0, while the API reference already shows `2026-10-28.endive` and npm shows `stripe` 23.1.0. Install the current SDK at M4 and use the version it ships with. Add `stripe` to `apps/server` in `boundaries.json`, and to no other workspace, with the reason in the commit.

### Objects, created by the owner

| Product | Price lookup key | Amount | Interval |
|---|---|---|---|
| Tondo Pro | `pro_month` | US$6 | Monthly |
| Tondo Pro | `pro_year` | US$60 | Yearly |
| Tondo Team, only when Team is on sale | `team_month` | US$4 a seat | Monthly |

Monthly and yearly share a Product, and each tier has its own, as Stripe advises. No code uses the old `plan` object. Prices are found by lookup key, so there's no price id in the environment. At startup with `PLANS_ON=true`, the server fetches the Pro keys and compares their amounts with `PRICES`, and exits if they differ.

**Customers.** Use Customer objects, stored as `cus_` in `stripe_id`. Stripe's design guide now recommends customer-configured Accounts for most uses, but its Accounts page says the v2 API is in public preview for anyone not on Connect and needs a preview API version. Enabling it also changes what Checkout creates, so the owner shouldn't enable it. `stripe_id` is neutral, so moving later is a change of values and not of schema.

**Client.** One `StripeClient` instance in `apps/server/src/stripe.ts`, with a restricted key (`rk_`), and never the global pattern. `STRIPE_API_BASE`, unset in production, points it at the stand-in, as `NEON_AUTH_BASE_URL` does for Neon.

### Routes

`apps/server/src/billing.ts`, mounted from `app.ts`. All of the first four need a session and JSON, which blocks cross-site posts as in `pages.ts`, and have a person-keyed limiter.

| Route | What it does |
|---|---|
| `GET /api/v1/me/billing` | Reads the subscription for Account: period, renewal or end date, and whether it's cancelling. Nothing is stored |
| `POST /api/v1/me/billing/checkout` | Body: `{ period, from }`, with `from` limited to a short list of return places. Creates the customer if there's no `stripe_id`, with idempotency key `customer-<user id>`, and saves it first. Then creates the Checkout Session below and returns `{ url }` |
| `POST /api/v1/me/billing/portal` | Creates a portal session with `return_url` `/app/account?billing=1`, and returns `{ url }`. 404 with no `stripe_id` |
| `POST /api/v1/me/billing/sync` | Runs `syncPlan` for this person's own customer. Used on return from Checkout and the portal, and takes no input |
| `POST /api/stripe/webhook` | No session. Reads `c.req.text()`, because any parsing breaks the signature. Verifies, then handles the event |

```ts
await client.checkout.sessions.create({
    mode: "subscription",
    customer: stripeId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/${from}?paid=1`,
    cancel_url: `${appUrl}/${from}`,
    integration_identifier: "tondo_plans_qhzmtvra",
    consent_collection: { terms_of_service: "required" },
    ...(taxOn ? { automatic_tax: { enabled: true }, customer_update: { address: "auto", name: "auto" }, tax_id_collection: { enabled: true } } : {}),
});
```

`appUrl` must be absolute, and `editorUrl` is the relative `/app` in production, so it's resolved against `PUBLIC_ORIGIN`. There's no `payment_method_types`, so payment methods come from Dashboard settings. Asking for agreement to the Terms is what the current Terms promise, and needs the Terms address set in the Dashboard first.

### The sync

Webhooks are required for subscriptions, and this function is what they run.

```ts
// apps/server/src/stripe.ts
const PAID = new Set(["active", "trialing", "past_due"]);
export async function syncPlan(customer: string): Promise<void> {
    const { data } = await client.subscriptions.list({ customer, status: "all", limit: 10 });
    const paid = data.find((sub) => PAID.has(sub.status));
    if (paid) return save(customer, { plan: planOf(paid), endsAt: null });
    const ended = latest(data.filter((sub) => sub.ended_at !== null));
    if (ended) return save(customer, { plan: planOf(ended), endsAt: new Date(ended.ended_at * 1000) });
}
```

| Stripe status | Result |
|---|---|
| `active`, `trialing` | Paid |
| `past_due` | Paid, so failed cards get the grace period Stripe's retries give |
| `canceled` | `ends_at` is Stripe's `ended_at`, so repeated events can't move the date |
| `unpaid`, `paused` | Not reachable with the settings below. If seen, `ends_at` becomes now if empty, and an error is logged |
| `incomplete`, `incomplete_expired` | No change |

- **Plan name.** `planOf` reads the first part of the price's lookup key. An unknown key is logged and treated as Pro, so nobody who paid is ever treated as Free because of a Dashboard mistake.
- **Private release.** `setPlan` never moves a future `ends_at` earlier, so someone on the free year who subscribes and then cancels keeps the rest of it.
- **Two subscriptions.** The Dashboard setting below prevents these, and the route's 409 covers most of what remains. If it still happens, the first paid one wins and an error is logged.
- **Cache.** Each change drops that person's page from the live cache.

### Webhook handling

- **Signature.** Verified with `client.parseEventNotification(body, header, secret)` before any other work, using the SDK's default tolerance. A bad signature gets 400. Confirm the exact Node name against the installed SDK, since I read it from the docs' examples.
- **Format.** A thin event destination, which Stripe recommends for new integrations and which suits this code, because the sync fetches current state anyway. All the events below are in the thin catalog I read.
- **Idempotency.** There's no events table. Every event leads to fetching current state and writing it, so duplicates and out-of-order delivery do no harm. Stripe says it guarantees neither order nor single delivery.
- **Retries.** If the sync throws, the route answers 500, and Stripe retries for up to three days in live mode. An unknown customer gets 200, because a deleted account's late events are expected. Replays are possible from the Dashboard for 15 days, and from the CLI for 30.
- **Speed.** The route waits for one Stripe read and one database write. Stripe advises answering quickly and using a queue at scale. I'm choosing Stripe's retries over adding a queue, and that's fine at this volume, but I haven't measured it.
- **Rate limit.** Left out, as the signature check is what protects it. Allow-listing Stripe's IP addresses is optional hardening that would depend on `TRUSTED_PROXY_HOPS`, which is still unchecked on Render.

| Event | Action |
|---|---|
| `v1.checkout.session.completed`, `.async_payment_succeeded`, `.async_payment_failed` | Sync |
| `v1.customer.subscription.created`, `.updated`, `.deleted` | Sync |
| `v1.invoice.paid`, `v1.invoice.payment_failed` | Sync |
| `v1.charge.dispute.created`, `v1.charge.refunded`, `v1.radar.early_fraud_warning.created` | Log the ids at error level. The owner decides case by case in the Dashboard, and Stripe's Dashboard notifications should be on for these. Cancelling there leads to a sync |

"Payment failing" on Home is worked out from `GET /me/billing`, so no column is needed.

### Portal

Configured by the owner in the Dashboard. Payment methods and invoice history on. Cancel at the end of the billing period, with reasons collected. Switching between `pro_month` and `pro_year`, with proration. Quantity off. Team isn't offered, because the portal must not sell a plan with no working features. Tax id editing on once tax is on.

### Failed payments

Smart Retries over 2 weeks, ending in "Cancel the subscription". Stripe then sets `canceled`, the sync sets `ends_at`, and the 30 days start. That's about 6 weeks from a failed card to a design change, with the page online throughout. Stripe's emails for failed payments and expiring cards are turned on in the Dashboard.

### Tax

`automatic_tax` collects nothing and gives no error until a registration is active, so turning it on is tied to the owner's step and not to a deploy. `STRIPE_TAX=true` adds the Checkout options above, and is set only once a live registration shows as Collecting. Before launch, a test purchase in the registered region must show tax on the invoice, with `taxability_reason` not `not_collecting`.

Candidates for the Products' tax code, from Stripe's list, for the owner and an accountant to confirm: `txcd_10103000` (SaaS, personal use) and `txcd_10103001` (SaaS, business use). See the [tax code guide](https://docs.stripe.com/tax/tax-codes). Who must register, and where, is a question for an accountant, and I'm not advising on it.

`tax_behavior` is set on each Price and has to be chosen before the live Prices exist. See the open decisions.

### Account deletion

In `auth.ts`, `DELETE /me` gains one step before photos: `client.customers.del(stripeId)`, which per Stripe's reference permanently deletes the customer and immediately cancels any active subscriptions. A `resource_missing` answer counts as done. If Stripe can't be reached, the existing `stoppedAt` path answers "We couldn't cancel your plan, so your account is still here. Please try again." and nothing has been removed, so nobody loses a page and keeps being billed. It's injected as `cancelBilling` in `AuthConfig`, as `removeFiles` is. There's no automatic refund on deletion, and the Terms say so.

Suspending a page for abuse doesn't cancel billing. `suspend.ts` prints a reminder if there's a `stripe_id`, because whether to refund is a judgement for the owner.

### Environment

Add to `.env.example`, `render.yaml` with `sync: false`, `deploy.md` and `playwright.config.ts`.

| Variable | Notes |
|---|---|
| `PLANS_ON` | `true` or `false`. Explicit in `render.yaml`, starting at `false` |
| `STRIPE_KEY` | Restricted key, stored in Render's environment |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the destination |
| `STRIPE_TAX` | `true` only with an active registration |
| `STRIPE_API_BASE` | Tests only |

The key's permissions are worked out in the sandbox by watching for 403s: write on Customers, Checkout Sessions and portal sessions, and read on Subscriptions, Prices, Invoices and Events.

## The Tondo mark

`renderDocument` in `packages/render/src/document.ts` gains `mark?: boolean` beside `trackAs`, since `packages/render` shouldn't know about plans. It draws a small inline SVG tondo and "Made with Tondo" in the look's text colour, linking to `https://tondo.page`, above the report link. It's outside `body`, so `trackLinks` doesn't touch it and it isn't counted as a click.

Only `/:handle` in `app.ts` passes `mark: limits.mark`, so the gallery, the editor preview and the labs never show it. It's plain HTML under the existing `PAGE_HEADERS`, so no script and no policy change. There's no setting: it's on or off by plan alone.

The editor's Preview shows it on Free, with the note above, so the live page has no surprise.

Tests: `packages/render/src/render.test.ts` for present, absent and no `<script`. `tests/contrast.spec.ts` checks it at 4.5:1 across all 50 looks.

## Downgrades, and emails

There's no job. Everything is derived on read, as above, so nothing can fail at midnight and there's nothing to re-run.

| Item | At the end of the plan | After 30 days | How |
|---|---|---|---|
| Address and visitors | Unchanged | Unchanged | Nothing reads the plan to decide whether to serve |
| Mark | Returns | Stays | `limits.mark` |
| Paid look, colour, font, photo background | Stay | Step down | `limits.design` |
| Paid sections and sections over 6 | Stay, editable | Stay, editable | `keepContent: true`, and `paidUses` ignores ids already live |
| Scheduled sections | Keep their schedule | Same | Same |
| Extra pages | Live, read-only | Live, read-only, stepped down. Taking one down frees its address | `isReadOnly` |
| Photos over 25 | Stay, and new uploads wait | Same | Count check on upload |
| Statistics | 7 days, nothing deleted | Same | Clamp on read |
| Draft | Keeps everything | Keeps everything | Never changed |

**Emails depend on a provider the repo hasn't chosen.** `roadmap.md` has it as step 3. Without one:

- **Stripe covers:** receipts, failed payments, expiring cards, and refund receipts, where the Dashboard settings are on.
- **Nothing covers:** "your design steps down in 7 days". Someone whose card failed and who never logs in would see their page change with no warning from us.

With a provider, this becomes one daily job, `apps/server/src/notices.ts`, that finds rows with `ends_at` about 23 days ago and sends once. "Sends once" would need a stored marker or a provider's idempotency key. I'd treat this as required before charging, and it's listed under open decisions. The Terms and pricing page don't promise any email until it exists.

## Existing accounts

- **Real accounts:** none are expected, as `qa.md` and `roadmap.md` say nothing is deployed.
- **Before the switch:** every account behaves as Pro, with `PLANS_ON=false`, and no label shows.
- **At the switch (M7):** run `pnpm --filter @tondo/db comp --all --months 12` first. Without it, any account published in the meantime would step down at once. Say so in the private release invitation.
- **Seeded and example pages:** written as `pro`, so no mark.

## Pricing page and Terms

**In M0, before anyone can sign up.** `pricing.astro` says "All 50 looks" and "Everything in Tondo is free today", and its FAQ promises notice before Free changes. M0 says what's decided, and that paying isn't available yet.

- Move `groups` and `heads` to `apps/marketing/src/data/plans.ts`, with cells that can be `yes`, `coming`, `no` or a value. Every number and price is read from `PLANS` and `PRICES`.
- New rows: 1 and 5 pages, 12 and all 50 looks, the look's colours and fonts against your own, 6 sections against no limit, 25 and 2,000 photos, 7 days against 90.
- Split the rows that are no longer shared: "Products and services", "A button that links to your booking page" (still free), "A Team section", "One page, with tabs".
- `tiles` in `pricing.astro` shows noir and bake as free. Use free looks only.
- Rewrite the hero, the Free card ("Your page, all 50 looks and your statistics"), the Pro card, which promises a domain that isn't built, the "What you get for free" section, the table note, the FAQ, and the closing line.
- Check `components/Pricing.astro`, `about.astro`, `signup.astro`, `teams.astro` and `PaintSection.astro`, which also mention free use.
- `gallery.astro`: a small Pro label on tiles using a Pro look.

**When each "Coming" and "Planned" comes off.** Never before it's true on production:

| Label | Comes off |
|---|---|
| Remove Tondo branding, under Pro | M7, once the mark ships and Pro can be bought |
| Up to 5 pages, under Pro | M7, after multiple pages ship |
| Pro's "Planned", and "Available" on its card | M7, in the same deploy as `PLANS_ON=true` |
| Custom domain, all-time statistics, favicon and the rest | Stay Coming |
| Everything under Team | Stay Coming until M8 |

Replacing "Pages carry no Tondo mark today" happens in M0, with "Free pages will carry a small Made with Tondo."

**Terms, in M7 and for the owner to approve.** They also gain the address rule from [multi-page-implementation.md](multi-page-implementation.md), and `comp --all` finds owners through `pages`. I'm not a lawyer, and an accountant or lawyer should read this before launch. Replace the section "Free service and paid plans" in `terms.astro` with:

> Tondo has a free plan and paid plans. Prices are shown on the pricing page, and we show the price and billing terms and ask you to agree before you're charged. Plans renew each month or year until you cancel, and you can cancel from your Account page. Cancelling takes effect at the end of the period you've paid for.
>
> If you ask within 14 days of your first payment for a plan, we'll refund it. Deleting your account cancels your plan straight away, without a refund for the rest of the period.
>
> If a plan ends, including after a payment fails and our retries run out, your page stays online at its address and your content stays. The Tondo mark returns and the free plan's limits apply. After 30 days, paid design choices such as paid looks, your own colours and fonts and photo backgrounds change to free ones on your live page. Your draft keeps them, so they return if you subscribe again.
>
> This doesn't change our right to remove a page for breaking these terms. If we change a price, we'll tell you before it applies to you.

Whether "we'll tell you" and a price-change period can be kept without an email provider is part of that decision. `privacy.astro` gains Stripe as a named processor (payment details, billing address, email), and states that Tondo stores only a Stripe id and a plan and never card numbers. Its "Last updated" date changes too.

## Multi-page

Replaced by [multi-page-implementation.md](multi-page-implementation.md): each page has its own address, 1 on Free and 5 on Pro.

## Team billing

**This depends on the undecided `teams-schema.md`, and shouldn't start until that's settled.** Team isn't for sale before it works, and nothing in M0 to M7 assumes more than a plan named `team`.

Under its recommended option C, a team is a `users` row, so `plan`, `stripe_id` and `ends_at` work on that row unchanged, and:

- **Limits:** `limitsFor` takes the owning row, so a member reads the team's plan through `team_id`. A row that is itself a team has `pages: 25`.
- **Seats:** the subscription quantity is the count of members, with a minimum of `TEAM_MINIMUM`. Checkout starts at the current count with quantity fixed, and portal quantity stays off, because seats follow membership.
- **Changing seats:** one function runs after a member joins or leaves, and calls `subscriptions.update` with the new quantity and proration. It reads the count every time, so it's safe to repeat.
- **The sync:** `v1.customer.subscription.item_quantity_changed` isn't needed, since `.updated` already runs it.

What each other option changes: under B, the columns move to `handles` and `limitsFor` reads from there, with the limits unchanged. Under A or D, there are two owners of a plan to handle. Questions that wait until then: whether pending people use a seat, what happens to someone's Pro on joining, and the Team yearly price, which `plans.md` doesn't state.

Size: as `teams-schema.md` estimates, 1.5 to 5 weeks of schema work by option, plus 2 to 3 weeks of screens and invitations.

## Testing

### Unit, in `pnpm check`

| File | Covers |
|---|---|
| `packages/page/src/limits.test.ts` | Each row of the state table, exact moments at `ends_at` and at 30 days, and `canAddPage`, `canPublishPage`, `isReadOnly`. 12 free looks and 38 paid, with all of `lookNames` covered |
| `packages/page/src/paid-uses.test.ts` | Each code, sample-only sections not counted, hidden not counted, blocks already live not counted, tabs and their contents, 6 against 7 |
| `packages/page/src/step-down.test.ts` | Each look maps to a free look. The result has no `paidUses`, and the input isn't changed. Links survive `keepContent: true`. `everyLayoutPage` renders after a step-down |
| `apps/marketing/src/data/plans.test.ts` | **The pricing page and limits agree.** Every value row equals `PLANS` and `PRICES`, the count of free looks matches, and no "yes" under Free covers a paid block. A second check in `tests/marketing.spec.ts` reads the built page |
| `apps/server/src/pages.test.ts`, `photos.test.ts` | Each enforcement point, on and off with `PLANS_ON` |
| `apps/server/src/billing.test.ts` | Bad signature refused, the status table, duplicates and reversed order giving the same row, unknown customer 200, a Stripe failure 500, an existing subscription 409, with the Stripe client passed in |
| `apps/server/src/auth.test.ts` | Delete cancels first, Stripe failure keeps everything, already-deleted customer continues |

### Stand-in for Stripe, in `pnpm e2e`

All ports in 8100 to 8109 are taken, so it can't have its own. `tests/stripe-stand-in.ts` exports a handler that `tests/neon-stand-in.ts` mounts on `PORTS.testNeon`, as it does for object storage, under `/v1`, `/v2` and `/pay`. `playwright.config.ts` sets `STRIPE_API_BASE`, a test key and secret, and `PLANS_ON=true`.

- **API:** customers, Checkout Sessions, portal sessions, subscriptions, prices and events. Typed with the SDK's types where possible, so its shapes can't drift unnoticed.
- **Payment page:** `/pay/:session` is a plain page with Pay and Cancel. Paying creates a subscription and posts a thin event to the server, signed with the same secret by real HMAC, so signature checking runs in tests with no test mode in the app.
- **Controls:** end a subscription, fail a payment, send an event twice, send events reversed.

To avoid rewriting every existing test, `finishStart` in `tests/helpers.ts` sets new accounts to Pro by writing to the test database, and `signUpToEditor(page, sections, { plan: "free" })` opts out. New: `tests/plans.spec.ts`:

1. Pro look label, try it, publish panel, free choices, preview, live page has a free look, draft unchanged.
2. Pay at publish, return, publish, live page has the paid look and no mark.
3. Free page has the mark and no `<script`.
4. 7 sections, 26th photo, 30-day statistics.
5. Cancel: page online, mark back, design kept, and with `ends_at` moved back 31 days, stepped down with the draft intact. Paying again restores it.
6. Delete account with a subscription cancels it.
7. A stale tab: `plan_limit` from the server shows the same prompt.

Both viewports run, as for every spec.

### Real pass in a Stripe sandbox, by hand, once in M5 and once before M7

The stand-in can't prove Stripe behaves as I've read, so this isn't optional.

```bash
stripe login
stripe listen --forward-to localhost:8101/api/stripe/webhook --events v1.checkout.session.completed,v1.customer.subscription.created,v1.customer.subscription.updated,v1.customer.subscription.deleted,v1.invoice.paid,v1.invoice.payment_failed
# Put the printed whsec_ in STRIPE_WEBHOOK_SECRET, then restart pnpm dev.
```

| Case | How | Expect |
|---|---|---|
| Pay | `4242 4242 4242 4242` | Pro within seconds, both with `stripe listen` running and with it stopped (the sync on return) |
| Declined at Checkout | `4000 0000 0000 0002` | Stays on Checkout, plan unchanged |
| Authentication | `4000 0025 0000 3155` | Challenge, then Pro |
| Renewal fails | `4000 0000 0000 0341`, which attaches and then fails, with a test clock advanced a month | `past_due`, still Pro, "Payment failing" shows, then after retries `canceled`, `ends_at` set |
| Yearly and switching | Portal, month to year | Plan stays Pro, invoice prorated |
| Cancel | Portal, then advance the clock past the period | Pro until the end, then `ends_at` equals Stripe's `ended_at` |
| Grace | Advance past 30 days, or set `ends_at` | Step-down on the live page |
| Duplicate | `stripe events resend <id>` | Nothing changes |
| Bad signature | Post by hand with a wrong header | 400 |
| Delete | Delete the account | Customer and subscription gone in the Dashboard |
| Tax | With a test registration and `STRIPE_TAX=true` | Tax on the invoice, and `taxability_reason` isn't `not_collecting` |

Test clocks are created under Billing in the Dashboard, and can advance up to two intervals at a time. Whether the CLI can forward every thin event in that list needs confirming on the first run, and `--all-thin` is the fallback. `stripe trigger` has limited value here, because its made-up objects don't belong to a Tondo customer.

### Lab and QA

- `apps/editor/src/components/PlanLab.tsx`, added to `apps/editor/src/app/labs.tsx`: every publish panel state, the labels, the free choices preview, and the mark on all 50 looks, with free and Pro switches, for development only.
- `BlockLab` is unchanged, and stays as Pro.
- `qa.md` gains a Plans section, written in M7 and re-read first since others edit it: both prompts on a phone, whether Free feels complete on real content, each free look with other people's words, whether the mark looks good on all 12, and the step-down pairs. `plans.md` itself says the look split has only been seen on each look's own page.
- `roadmap.md`: paid plans move from "after the private release" to this plan.
- `deploy.md`: the variables and the launch steps.

## What the owner must do

I won't create or change anything in Stripe. Steps 1 to 4 are needed to begin M5's real pass. M1 to M4 can be built and tested with no account, using the stand-in.

**Now, ideally:**

1. **Decide the entity and country.** Which company holds the Stripe account, and its country, with an accountant's advice. My notes record GalleoApp, Inc. as Galleo's Delaware company and you in British Columbia, but nothing says Tondo belongs to it. This decides settlement currency and whether US$ prices convert.
2. **Create or choose the Stripe account** and turn on two-step sign-in with a passkey or authenticator app. Don't enable Accounts v2 under Settings, Previews.
3. **Create two sandboxes,** one for development and one spare for CI later, rather than using the shared test mode. In the development one:
   - Create the Tondo Pro Product with `pro_month` and `pro_year`, as in the table above. Only the owner's decision on `tax_behavior` is needed first.
   - Activate the Customer Portal with the settings under [Portal](#portal).
   - Under Checkout and Payment Links settings, turn on redirecting people with an active subscription to the portal. Stripe says the portal's login link must stay enabled for this to keep working.
   - Under Revenue recovery, Retries: Smart Retries over 2 weeks, ending in Cancel the subscription.
   - Set the Terms and Privacy addresses in public details, which `consent_collection` needs.
4. **Make a restricted key** in the development sandbox, and put it in local `.env` as `STRIPE_KEY`. Never commit it, and don't paste it into a chat.

**Before charging (M7):**

5. **Activate live mode:** business details, bank account, statement descriptor such as TONDO, support email, and branding on Checkout and the portal.
6. **Tax, with an accountant:** set the head office address under Tax, Settings. Choose the tax code. Register with the relevant authorities. Adding a registration in Stripe only records that you're registered. Add it under Tax, Locations, and check Needs attention from then on. Filing is separate from collecting.
7. **Repeat step 3 in live mode,** since nothing carries over from a sandbox.
8. **Create a thin event destination** at `https://tondo.page/api/stripe/webhook` with the events in [Webhook handling](#webhook-handling), and copy its signing secret.
9. **Make a live restricted key,** and set `STRIPE_KEY` and `STRIPE_WEBHOOK_SECRET` in Render, then `STRIPE_TAX=true` once a registration is collecting.
10. **Turn on emails** under Subscriptions and emails: receipts, failed payments, expiring cards.
11. **Choose the email provider** in Neon and for notices, as `deploy.md` already asks.
12. **Read and approve** the Terms and Privacy text, ideally with a lawyer. Decide where refund requests go, since they're handled by hand in the Dashboard.
13. **Go through Stripe's [go-live checklist](https://docs.stripe.com/get-started/checklist/go-live).**

## Milestones

Each one ships alone and passes `pnpm check` and `pnpm e2e`, the two being separate commands. Nothing changes for anyone until M7. Sizes are estimates.

| # | Milestone | Size | Ships as |
|---|---|---|---|
| M0 | Honest pricing copy and `data/plans.ts`, with numbers typed in | 1 to 2 days | Visible. Says what's decided, and that nothing can be bought |
| M1 | Migration, limits module, `blocked.ts` split, `/me`, stats clamp, photo limit and delete, `comp.ts`, `PLANS_ON`, pricing reads `PLANS` with the parity test | 3 to 4 days | Dark, apart from photo removal |
| M2 | `paidUses`, `stepDown`, free look table, publish check, free choices | 3 to 4 days | Dark |
| M3 | Pro labels, prompts, panel, preview, Analytics, Home notices, `PlanLab` | 3 to 4 days | Dark, since `billing` is false |
| M4 | Mark, live step-down, cache drop | 2 days | Dark |
| M5 | `stripe.ts`, `billing.ts`, webhook, stand-in, Account's Plan section, deletion, sandbox pass | 5 to 6 days | Dark, tested against the sandbox |
| M6 | P1 to P5 in [multi-page-implementation.md](multi-page-implementation.md) | See that plan | Visible, in that plan's order |
| M7 | Terms, Privacy, final pricing, QA, comps, live setup, `PLANS_ON=true` | 2 to 3 days, plus the owner's steps and accountant | Charging opens |
| M8 | Team billing, dependent on `teams-schema.md` | Part of the Team estimate | Later |

M0 to M5 and M7 come to about 4 to 5 weeks, a little over the 3 to 4 estimated in `plans.md`, and M6 makes it about 7. M6 shipping visibly means anyone on a private release can make up to 10 pages for free for now, which is what the 12 free months would give them anyway.

**Done for each:** code, unit tests, a Playwright path on both viewports, docs updated, sparing comments and no build-phase references in code. `pnpm ports:audit` isn't needed, as no port is added.

### Order for parallel agents

```
M0 ────────────────────────────────┐
M1 ─┬─ M2 ─┬─ M3 ──────────┐       │
    │      └─ M4 ──────────┤       ├─ M7
    └─ M5 ─────────────────┼─ M6 ──┘
```

1. **One agent, alone:** M1, since it holds the migration, the contract and the module everything imports. M0 can run beside it, because it only touches marketing. M1 then replaces M0's typed numbers with `PLANS` and adds the parity test.
2. **Three at once after M1:**
   - Agent A takes M2 then M3, in `packages/page` and the editor.
   - Agent B takes M4, in `packages/render` and `app.ts`.
   - Agent C takes M5, in `billing.ts`, `stripe.ts`, the stand-in and `auth.ts`, plus `AccountPage.tsx`.
3. **Then M6,** which is P1 to P5 in [multi-page-implementation.md](multi-page-implementation.md), after M3 and M5 land.
4. **Then M7,** one agent with the owner.

Shared files to take turns on: `apps/server/src/app.ts` (B and C), `packages/contract/src/index.ts` (M1 adds what's foreseeable), `tests/helpers.ts`. Only M1 generates a migration, so numbering can't clash. `Editor.tsx`, `Canvas.tsx`, `tests/editor.spec.ts`, `README.md` and `qa.md` have uncommitted work from others today, so re-read them first and commit only your own files.

## Risks

| Risk | What could happen | What to do |
|---|---|---|
| **Failing to gate without noticing** | `PLANS_ON` stays false or unset in production, and everyone is Pro forever with no error | Explicit in `render.yaml`. A boot line states the setting. M7's steps end with a check on production: a new free account can't publish a Pro look, and sees the mark |
| **Gates on with no way to pay** | `PLANS_ON=true` with a missing key or wrong Prices is a dead end | Server exits at boot with `PLANS_ON=true` and missing keys, prices or amounts. Render keeps the old deploy, since `/health` never answers. Free choices always remains on the panel |
| Stripe down at publish | Checkout fails | Message, and free choices |
| Webhook secret wrong or endpoint unreachable | People pay and stay on Free | Sync on return covers the first payment. Later events retry for 3 days. Check the destination's error rate in the Dashboard in the first weeks. A resend is available for 15 days |
| Silent zero tax | `automatic_tax` on with no registration collects nothing, without error | `STRIPE_TAX` only after a registration is collecting, and a real purchase check |
| Page changes with no warning | Without an email provider, a lapsed person's design steps down unseen | Provider before charging, as recommended. Otherwise, knowingly accept it |
| Public promise | The downgrade rule is hard to take back | Reviewed in the Terms step. `plans.md` accepts the leak that Shop and Tabs stay after one month |
| Free feels mean | Own colour and 7 days are stricter than competitors. No evidence on conversion | QA on real content. Option C is a change of numbers in `limits.ts` and one table |
| Stand-in differs from Stripe | Tests pass and real behaviour differs | Two real passes, SDK types on the stand-in |
| Thin event details | I read these from docs and haven't run them | First task of M5's sandbox pass. Snapshot events are the fallback, and the sync doesn't change |
| Refund gap | A person who refunds keeps their paid design 30 days | Accepted at this size |
| Abuse through free pages | The mark and free hosting attract phishing | Blocked hosts and the report link apply on every plan and every page |
| One process | Plan changes on one instance leave others stale for 15 seconds, as `deploy.md` says | Fine on one instance |
| Other agents in this tree | Merges in `Editor.tsx` | The order above, and small commits |

### Before launch

1. All of M0 to M7 on production, with `pnpm check` and `pnpm e2e` green.
2. Real sandbox pass, then one real purchase with the owner's own card in live mode, followed by a refund and cancel.
3. Comps run, and the private release invitation says what they get.
4. Tax confirmed, or a written decision from the accountant.
5. Terms and Privacy approved, and the production check for gating done.
6. Rollback known: `PLANS_ON=false` removes all gates at once, without touching anyone's subscription. Paying people should then be told, and Stripe stays the record of who pays.

## What changed while building

Where the code or a later decision differed from the plan above, this is what was done.

- **Migration number.** Help me's `usage` table took `0003`, so the plan's columns are `0004`. It only adds columns, with defaults, so existing rows stay.
- **Help me credits are in `Limits`.** They arrived after the plan was written: 15 on Free and 100 on paid plans. While `PLANS_ON` is off, everyone behaves as Pro apart from credits, which stay at 15, because they cost money per use. `TONDO_PLAN=pro` still raises them locally.
- **Help me's photo routes count too.** Picking a stock photo and making images store files, so both check the same photo limit. Making images wasn't limited before.
- **Page limits are one number so far.** `Limits` has `pages`, now 5 on Pro. `drafts`, `canAddPage`, `canPublishPage` and `isReadOnly` arrive with P1, when something uses them. The pricing table doesn't state pages per plan yet.
- **`Draft` isn't given the plan.** Routes ask `findPlan` once, through `limitsOfPerson`, so only `LivePage` gains the plan (with the mark).
- **`/me` also returns `endsAt`,** which Account's private release line and Home's notices need.
- **`limitsFor` accepts any plan text** and treats one it doesn't know as Free, so a bad value in the database can't break a page.
- **`paidUses` is given the look's label.** Labels live in `packages/render`, which `packages/page` can't import, so callers pass them in.
- **A new schedule counts even on a section already live.** The plan exempted any block already live, which would let someone schedule a live section for free. A schedule that's already live, unchanged, stays exempt.
- **Over 6 sections after a downgrade.** The limit becomes the larger of 6 and what's live now, so a page with 8 live can still swap sections but can't reach 9.
- **Free choices keep a design the plan still allows.** During the 30 days, `free: true` removes only the content that needs Pro, and leaves the look alone.
- **The look pairs haven't been checked on screenshots.** Plan M2 asked for it, and it's still to do, listed with QA.
- **The schedule label sits on its own line** above Show from and Show until, because those labels are plain field text shared with every field.
- **The first-time notes come from one place.** The editor compares what's being tried with what it has already mentioned, so no panel needs its own prompt code. They appear as a short toast.
- **The SDK's class is `Stripe`.** Version 23.1.0 has no `StripeClient`, and the API version it ships with is `2026-10-28.endive`. `parseEventNotification` is the right name. Every Stripe call goes through a small `Payments` interface in `stripe.ts`, so routes are tested with a fake. Finding the customer on a thin event uses `fetchRelatedObject`, which I've only run against the stand-in.
- **Someone on free months can't subscribe until they end.** The plan wanted `setPlan` to keep the later date, but keeping a future `ends_at` on a paying person would put them on Free when it passed, until the next webhook. Without a new column, refusing checkout with a 409 is the simplest correct rule. `setPlan` only keeps a stored date for `unpaid` and `paused`.
- **The stand-in isn't typed with the SDK's types,** because `stripe` belongs to `apps/server` alone and the tests would have to import it from there. Shapes can drift, which is another reason for the real pass.
- **A failed payment shows on Account and Home.** Both read `GET /me/billing`, and Home only asks when the person has a paid plan.
- **Checkout always starts monthly from the panel.** The panel shows "or $60 a year" beside the button, and Stripe's portal switches between the two. A yearly choice before paying would be one more button, and the owner should decide whether it's wanted.
- **The state of the plan is one signal in the editor,** `state/plan.ts`, set when the account loads, so panels don't pass it down.

## Decisions still open

1. **Stripe account's entity, country and tax registrations.** Only the owner and an accountant can settle this, and it's needed before M7. Separately worth asking: Stripe's Managed Payments, where Stripe is merchant of record for tax in more than 80 countries, lists Canada and the US as supported business locations, and works with Checkout. It could remove the registration work, subject to an eligibility review. I haven't compared its fees or checked how the portal behaves with it. **Recommendation:** ask for this first, because it changes step 6 more than any code.
2. **Tax included in the price, or added at checkout.** Decided: added at checkout, as `exclusive`. Set it on each Price when the owner creates them.
3. **An email provider before charging.** **Recommendation:** yes, so the step-down warning exists. `roadmap.md` already has this before deploy, so the likely cost is ordering and not extra work.
4. **Teams schema**, the first question in `teams-schema.md`. It only affects M8. **Recommendation:** leave until Team is next, with option C as the working assumption.
5. **Nonprofits and community groups.** Decided: no nonprofit tier. Requests can be handled by hand with `comp.ts`.
6. **The 12 free looks and the 38 mappings.** Decided: keep the 12. The 38 pairs still need looking at side by side in M7's QA, at `?plans` in the dev editor, since changing one is a one-line edit.

Everything else in `plans.md`'s list is settled above or out of scope.
