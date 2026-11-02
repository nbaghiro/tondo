# Plans proposal

**Current plans, decided on 2026-11-01. This replaces option A below and the older decision that follows it.** Free has no live page, and paying is what puts a page online. Design and sections are no longer limited on any plan. This is built behind `PLANS_ON`, see [plans-implementation.md](plans-implementation.md).

| | Free | Starter, $4 a month or $40 a year | Pro, $10 a month or $100 a year |
|---|---|---|---|
| Live pages | None | 1 | 5 |
| Build and preview | Yes | Yes | Yes |
| Looks, colours, fonts, backgrounds and sections | All | All | All |
| Help me credits a month | 15 | 100 | 300 |
| Photos | 25 | 2,000 | 2,000 |
| Statistics | No live page to count | All ranges | All ranges |
| Team features | No | No | Yes, at one price for the account |
| Tondo mark | No live page to carry it | None | None |

The owner chose these: no live page on Free, prices of $4 and $10, one flat price for the $10 plan, and pages going offline when someone stops paying. The address stops showing the page when the paid period ends, the content stays, and subscribing again restores it.

These are working defaults, and the owner can change them: the names Starter and Pro, the yearly prices (two months free, as at $6 and $60), the credit and photo numbers, and 5 pages on Pro.

**Still open:**

1. How many people the flat $10 plan allows. A team's Help me use costs money per turn, so an unlimited team at one price could lose money. I suggest 10 people sharing the 300 credits.
2. Whether an address can be held without paying. Today it's claimed during sign-up. I suggest it can be held, with unused free addresses released later, since a person needs to see their address while building.
3. Whether a failed payment gets a few days before the page goes offline. Stripe's retries over 2 weeks already give some time, and I suggest the page stays up until those retries end.

**What this gives up.** Without live free pages there's no mark on free pages to bring in new people, and no live free page to set Tondo apart from Liinks, which works the same way. Its entry plan is $5, so $4 is slightly cheaper. Nobody has tested either price with real people.

The rest of this file is the earlier decision and proposal, kept as history.

**Decided on 2026-11-01:** the owner chose option A. Free has 1 page, 12 looks, each look's colours and fonts, 14 kinds of section, 6 sections, 25 photos, 7 days of statistics and the mark. Pro at $6 adds everything else and 10 pages. Team adds 25 pages on a team address. Paid items can be tried and are paid for at publish. A downgrade keeps the address and content, and the design steps down after 30 days. The build plan, and which of the decisions below are settled, is in [plans-implementation.md](plans-implementation.md). None of it is built yet.

The rest of this file is the proposal as it was written. Prices and gates at other products were read on 2026-11-01 from public pages, without signing up or logging in. Margins and sizes are my estimates. Tondo has no paying customers and no traffic, and it isn't deployed, so no figure about Tondo's own users is a measurement.

The side-by-side comparison is at http://localhost:8107/.scratchpad/plans/index.html.

This version replaces the earlier recommendation, under which every look stayed free and nothing built today was gated. The owner's objection was right: most of that Pro wasn't built, so today's product would have been wholly free and paying would have had no value on day one.

## Recommendation

I recommend option A: a Free plan with real limits, Pro at $6 a month or $60 a year, and Team at $4 a person from 3 people, once it's built.

**Free:** 12 looks, each look's own colours and fonts, 14 kinds of section with up to 6 on a page, 25 photos, 7 days of statistics, one page and a small Tondo mark.

**Pro:** all 50 looks, your own colour, 8 font pairings, a photo background, Shop, Services, Bookings, Team and Tabs, no section limit, 2,000 photos, 90 days of statistics and no mark. Up to 10 pages under your address is part of Pro, and isn't built yet. Neither is a custom domain.

**Team:** everything in Pro for each person, plus an address for the team with up to 25 pages, a shared look, roles, invitation links, duplicating a page and a team total in statistics. None of this is built.

1. **Paying has value from existing features.** Everything in the Pro list above works today, apart from pages and domains, and the mark is new. Billing, gating and the mark take an estimated 3 to 4 weeks, and sub-pages about 2 to 3 more.
2. **Free pages still look finished.** Nothing about a free look is degraded, and a page limited to a look's own colours can't go wrong. That protects both the person and what free pages say about Tondo.
3. **Anyone can try everything.** Paid looks show in the picker with a small Pro label, work fully in the editor, and only ask for payment at publish. Choosing "Publish with a free look" is one press and loses no work.
4. **A live page never goes offline.** This is the clearest difference from Liinks, which takes a page down the moment a trial is cancelled or a payment fails.

The weaknesses are real. I have no evidence on how many people will pay. Gating your own colour is stricter than Beacons, whose Free plan includes custom colours and fonts. 7 days of statistics is shorter than any free plan I read (Campsite 14, Linktree 28, Milkshake 30). If Free feels mean in testing, option C is the fallback, and it's a change of numbers rather than a rebuild.

## What Liinks really does

Checked on 2026-11-01. The earlier notes were right: $5 and $12, with no free plan.

| Question | What Liinks does | Source |
|---|---|---|
| Tiers | Starter $5 a month or $48 a year. Pro $12 a month or $120 a year per pack of 5 profiles, up to 100. Above that, contact them | [Plans](https://www.liinks.co/help/article/what-plans-are-available), [Team pricing](https://www.liinks.co/help/article/pro-plan-team-members-pricing) |
| Free use | "There is no free plan." Anyone can build and preview for free with no time limit, and subscribing is what makes a page live. There's no separate publish step in its help | [Overview](https://www.liinks.co/llms.txt), [Create a page](https://www.liinks.co/help/article/16-create-a-page) |
| Trial | 14 days on your first subscription, starting when you go live. Cancelling inside it costs nothing | [Plans](https://www.liinks.co/help/article/what-plans-are-available) |
| Design | **Not gated.** 60 themes, about 1,830 Google Fonts, 37 pairings, and solid, gradient, split, animated or image backgrounds. Its design articles mention no plan | [Customise](https://www.liinks.co/help/article/how-can-i-customize-my-page), [Design options](https://www.liinks.co/help/article/design-options), [Custom styles](https://www.liinks.co/help/article/custom-styles) |
| Blocks and pages | Unlimited blocks and tabs on both plans. No limit stated on photos or tabs | [Pricing](https://liinks.co/pricing), [Tabs](https://www.liinks.co/help/article/multiple-pages) |
| Analytics | All-time or custom ranges on both plans, with custom ranges up to 2 years apart. No retention stated | [Pricing](https://liinks.co/pricing), [Performance](https://www.liinks.co/help/article/how-do-i-see-how-my-page-is-performing) |
| Branding | A "Made with Liinks" badge is on by default. Any subscriber can hide it, on Starter or Pro and during the trial, and can then add their own logo. The badge is also the owner's referral link | [Branding](https://www.liinks.co/help/article/hide-liinks-branding) |
| Pro only | Custom domain, a URL for each tab, sharing metadata, several profiles with login links, duplicating profiles, beta features such as AI chat. Shared themes are listed as coming soon | [Pricing](https://liinks.co/pricing), [Features](https://www.liinks.co/features.md) |
| Upgrade moment | Going live is the gate. How the prompt looks isn't described anywhere public | [Create a page](https://www.liinks.co/help/article/16-create-a-page) |
| Trial cancelled, or a payment fails | **The page goes offline immediately.** The address and any domain stop showing it, analytics stop, and QR codes stop working, including printed ones | [Cancel](https://www.liinks.co/help/article/how-can-i-cancel-my-subscription) |
| Paid plan cancelled | Stays live to the end of the period, then goes offline in the same way. On Pro, all managed pages go too. Content stays, and you can log in, edit and resubscribe | [Cancel](https://www.liinks.co/help/article/how-can-i-cancel-my-subscription) |
| Stated reason | "Because you're the customer, not the product." | [Home](https://www.liinks.co/) |

What I take from this: Liinks doesn't have to gate design, because it has one gate, which is being online at all. Its Starter plan at $5 gives the whole design range and no custom domain. Copying its gates onto a free plan wouldn't work, since it has none to copy. Earlier notes said Liinks states no downgrade rule, and its help centre does state one. `.scratchpad/multipage/notes.md` still says otherwise.

**Unconfirmed at Liinks:** whether the trial needs a card, what a stopped page shows visitors, and when and how the subscribe prompt appears. Its pricing FAQ doesn't say what happens when a trial runs out without cancelling, and I'm assuming billing begins. A [Trustpilot review from June 2026](https://ca.trustpilot.com/review/liinks.co) complains of a page showing an error after payment, and Liinks blamed characters in the username, so that's not evidence on policy.

**Only the owner can see these, signed in to Liinks:**

1. When the subscribe prompt first appears, and its wording.
2. Whether it asks for a card to start the trial.
3. Whether any theme or font carries a lock or label, as nothing public suggests.
4. What Starter sees on pressing custom domain, tab URLs or sharing metadata.
5. Whether a preview link can be shared before subscribing.
6. What `liinks.co/yourname` shows a visitor before going live and after cancelling (a second browser would show this).
7. What emails arrive during the trial, and what the cancellation flow offers.

## How others gate design

| Product | Themes | Colours and fonts | Backgrounds | Removing branding | Free statistics | Sources |
|---|---|---|---|---|---|---|
| Linktree | Free has a set. Pro and Premium add themes marked with a lightning bolt | Fonts and font colour are listed under Pro and Premium in one article, and with no plan in another | Image or video on Pro and Premium | Pro and Premium per help, Premium per pricing page | 28 days. Starter 90, Pro 365, Premium lifetime | [Paid features](https://linktr.ee/help/articles/5434140-an-overview-of-paid-features-available-on-linktree), [Design](https://linktr.ee/help/articles/8614125-customizing-your-linktree-design), [Logo](https://linktr.ee/help/articles/5434182-how-to-remove-the-linktree-logo), [Pricing](https://linktr.ee/s/pricing) |
| Beacons | Not assigned to a plan | Free includes "custom colors, fonts, images, and more" | Uploaded video and image backgrounds appear on Creator Plus, though the table is unclear | Creator Plus at $30 per help. Third parties name other tiers | Real-time listed, range not stated | [Plans help](https://help.beacons.ai/en/articles/4695681), [Plans](https://beacons.ai/i/plans) |
| Later | Pre-made themes, no plan named in the search summary | Colours and fonts, no plan named in the summary | Colour or image, same caveat | Free shows a Later banner, and Starter removes it | Stated only for paid plans, 1 to 2 years | [Pricing](https://later.com/pricing/), help articles returned 403, so read only through search summaries: [Plans](https://help.later.com/hc/en-us/articles/360043255013), [Design](https://help.later.com/hc/articles/4988904359959) |
| Campsite | Free and Pro | Theme customisation on both. Fonts not mentioned | Image, pattern and animated gradient on Pro | Pro | 14 days plus totals | [Pricing](https://campsite.bio/pricing) |

So gating some looks has a precedent at Linktree. Gating photo backgrounds has precedents at Linktree, Campsite and probably Beacons. Gating your own colour has only a partial precedent, in Linktree listing font colour under Pro and Premium, so it's the most aggressive choice here. Whether a locked Linktree theme can be previewed, and what a downgraded page does with one, isn't in anything I could read.

## What other products charge

All rows were checked on 2026-11-01. Prices are in USD as shown, per month unless marked. Annual is the yearly bill, or a monthly rate billed yearly where it says "a month". Linktree and Milkshake say prices vary by region or platform, and the page may differ where you are.

| Product | Tiers | Monthly | Annual | What's free | Limits | Seller fees | Trial | Team pricing | What gates the upgrade | Status | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Liinks | Starter; Pro per pack of 5 profiles, up to 100 | $5; $12 | $48; $120 | No free plan. You can build and preview free with no time limit, and nothing goes live until you subscribe | Unlimited blocks, socials and dynamic QR codes. No limit stated on themes (60), fonts or tabs | No store, none listed | 14 days at first subscription. Card rule not stated | Pro: $12 per 5 profiles. Roles aren't described | Going live on every plan. Pro adds custom domain, tab URLs, share previews, several profiles, beta features | Confirmed, including its help centre | [Pricing](https://liinks.co/pricing), [Plans](https://www.liinks.co/help/article/what-plans-are-available), [Cancel](https://www.liinks.co/help/article/how-can-i-cancel-my-subscription) |
| Linktree | Free; Starter; Pro; Premium | $0; $9; $17; $35 | $7, $14, $30 a month | Unlimited links, core appearance, basic analytics | Numeric limits not shown. Prices vary by region | 12%, 9%, 9%, 0%, plus Stripe 2.9% + $0.30. A cached copy says selling needs Pro, so Free's 12% is unclear | 7 days on Pro and Premium (cached copy) | Each plan covers one Linktree. Workspaces has limited availability | Appearance, scheduling, analytics, SEO, commerce. Its pricing page lists removing branding under Premium, and its help says Pro and Premium | Partly confirmed. Prices come from a tracker's captures of its page, and fees and trial from cached copies | [Pricing](https://linktr.ee/s/pricing), [Fee help](https://linktr.ee/help/en/articles/11410206-understanding-transaction-and-processing-fees-on-linktree), [PricingSaaS](https://pricingsaas.com/companies/linktree/diffs/2026W44) |
| Beacons | Free; Creator; Creator Plus; Creator Max | $0; $10; $30; $100 | $100; $300; $1,000 | Link in bio, media kit, unlimited digital products, 50 emails a month, 1 website with 1 page | Emails 50, 500, then unlimited. Websites 1, 5, 10, 15 | 9%, 9%, 0%, 0% | None mentioned | Not listed | Custom domain, AI credits, fees, courses, email volume. Logo removal is on Creator Plus, per its help | Confirmed. Some per-plan limits repeat on the page | [Plans](https://beacons.ai/i/plans) |
| Stan | Creator; Creator Pro | $29; $99 | $300; $948 | No free plan | Unlimited products and customers. Contact caps not listed | 0%, plus Stripe or PayPal processing | 14 days | Not stated | Email, pixels, discount codes, upsells and instalments are on Creator Pro | Own article, updated 2026-07-22. Its /pricing address returned 404 | [Pricing article](https://stan.store/blog/stan-store-pricing/) |
| Later | Starter; Growth; Scale (a scheduling product) | About $25; $50; $110 | $18.75, $37.50, $82.50 a month | Its page says the link in bio tool is free, without stating limits | 1, 2, 6 social sets. Link in bio stats up to 1 or 2 years | Not stated | 14 days | 1, 2, 4 users. Extra users $3.75 a month on Growth and Scale | Scheduling volume, collaboration, up to 5 links per post | Confirmed for yearly prices. Monthly prices aren't shown, and those here are worked out from its 25% discount | [Pricing](https://later.com/pricing/), [Link in bio](https://later.com/link-in-bio/) |
| Shorby | Rocket; Pro; Agency | $15; $29; $99 | $12, $24, $82 a month | No free plan, per the review. Another directory says there is one | 5, 50, 250 pages | No checkout | 14 days | Agency: up to 10 members | Number of pages, feeds, custom domain | Not confirmed. Its own pages returned no content, so this is a review site dated 2026-09-02 that marks itself stale | [Own site](https://shor.by/pricing), [Review](https://frontdeskreview.com/software/link-in-bio/shorby/) |
| Carrd | Free; Pro Lite; Pro Standard; Pro Plus (larger sizes exist) | Yearly only | $9; $19; $49 | 3 sites with core features and Carrd branding | 3, 10, 25 sites at the entry sizes, up to 1,000 | No store, none listed | 7 days of Pro features with no card | None listed | Custom domain, forms, embeds, analytics, branding | Confirmed. It's a one-page site builder and bills yearly | [Pro](https://carrd.com/pro), [Home](https://carrd.com/) |
| Campsite | Free; Pro; Pro+; Org Pro; Org Pro+ | $0; $7; $24; $14; $29 | 16% off. Dollar amounts not shown | Unlimited links, themes, tip jar, 14 days of stats | Stats 14 days, 60 days, lifetime | 0% on all, stated as for a limited time | 10 days | Extra profile $1.50. Extra member $6 on Org | Backgrounds, animated gradients, custom domain, branding, pixels, longer stats | Confirmed. Its page disagrees with itself on Pro+ profiles and Pro collaborators | [Pricing](https://campsite.bio/pricing) |
| Milkshake | Free; Lite; Pro; Pro+ | $0; $2.99; $6.99; $10 (billed quarterly) | Pro $59.99; Pro+ $99.99 | Unlimited links and cards, templates, colours, fonts, QR codes, 30 days of stats, selling files | Up to 5 sites by switching accounts. Stats 30 or 365 days | 12%, 12%, 9%, 7% | None shown. No card to sign up | None listed | Branding on its own at Lite. Custom domain only on Pro+ | Confirmed | [Home](https://milkshake.app), [Pricing](https://milkshake.app/pricing) |
| Taplink | Basic; Pro; Business | $0; about $3; about $6 | 6 and 12 month discounts. Figures unclear | A simple page: a few links, text and a theme | Up to 512 pages, by its own blog | 0%, by its own blog | Not stated | One Instagram profile per plan | 3 month minimum on paid plans | Not confirmed. Its price page gave only a title, so prices are from G2 and conflict with Capterra | [FAQ](https://taplink.at/en/pricing/), [Own blog](https://taplink.at/en/blog/lnk-bio-alternative.html), [G2](https://www.g2.com/products/taplink/reviews) |
| Lnk.Bio | Free; Mini; Unique. Multi-account Basic, Mini, Unique | Single: $0; about $0.99. Three accounts: $2; $3; $8 | Single Unique about $24.99 once. Three accounts: $20; $30; $75 | A free tier with unlimited links, per third parties | 3, 5, 10 swipeable pages | 5% on digital products, per a competitor's blog | Not found | 3 to 50 accounts, up to $85 a month | Pages, domain, newsletter sync | Partly confirmed. Multi-account prices are its own, single-account ones are third-party, and lnk.bio returned 403 | [Multi-account](https://lnk.at/multi-account), [Toolradar](https://toolradar.com/tools/lnk-bio/pricing) |
| Koji | None | None | None | None | None | None | None | None | Linktree bought it in December 2023 and said it would close on 2024-01-31 | Closed. No successor found | [TechCrunch](https://techcrunch.com/2023/12/14/linktree-acquires-link-in-bio-platform-koji-in-its-second-investment-of-the-year/embed/), [Tubefilter](https://www.tubefilter.com/2023/12/14/linktree-link-in-bio-acquires-koji/) |

This updates [competitors.md](competitors.md), whose Linktree prices of about $8, $15 and $35 are now out of date, according to the PricingSaaS capture.

## The Free plan, and why

I didn't interview anyone, and nothing here has been tested. What follows is my judgement about what might move regular people, reasoned from how these gates are set elsewhere.

- **Gate what makes a page distinctive, and not what makes it good.** Free looks are complete, and nothing is watermarked or dimmed. The difference is that a free page looks well designed, and a Pro page looks like yours: signature headers, your colour, your photo behind everything.
- **Let people want it first.** Someone who has seen their own words in Bakehouse has a concrete reason to pay, which a price table can't give them. The risk is that this feels like a trap, so Pro labels are visible before anything is chosen and the free way out is always offered with equal weight.
- **Gate what businesses need.** Shop, Services, Bookings and Tabs are what a small business reaches for, and it's the group most likely to have a reason to pay. Someone who only needs a link can still add a plain button to their shop or booking page, and the prompt says so. Nobody's blocked from linking to anything.
- **Don't gate links or the basics.** Linktree, Campsite and Milkshake all offer unlimited links, so a limit there would make Tondo look worse immediately.
- **The mark should be nice to have on a page.** A small painted tondo and "Made with Tondo", in the look's own text colour, above the report link. It's plain HTML, so public pages still send no JavaScript. It's the only thing added to a free page.

Some measurements behind the numbers, from the 52 example pages in `apps/marketing/src/data/pages`. These pages are fictional and were written to show range, so they only give a rough sense of size:

| Measure | Result | What I did with it |
|---|---|---|
| Sections on a page | Median 5, most 8. 46 of 52 have 6 or fewer | A limit of 6 fits most pages, and is felt by the fullest |
| Photos on a page | Median 3, most 10 | 25 leaves room for replacing photos and is felt by photo-heavy pages |
| Pages using Shop, Services, Bookings, Team or Tabs | 33 of 52. Those without are mostly personal pages and small projects | This gate falls mostly on businesses, as intended. Note that many sample pages use it, so test whether Free still feels complete |

**A photo problem to fix first:** `apps/server/src/photos.ts` has routes to list and upload, and none to delete. Today's limit of 200 is out of reach, so this doesn't matter. At 25, someone who has replaced a photo a few times would be stuck, so a delete route has to ship with this limit. It's in the build sketch below.

## Gating table

These are exact limits under option A. Sub-pages aren't built, so that row says what happens today and later. "Try only" means it works in the editor and needs Pro to publish.

**Your page**

| Built today | Free | Pro | Team (not built) |
|---|---|---|---|
| Address at tondo.page | Yes | Yes | Yes, one a person |
| Live pages (sub-pages aren't built) | 1 | 1 today, 10 once built | 1 today, 10 a person once built |
| Publish, preview, take down, change address | Yes | Yes | Yes |
| Share title and description | Yes | Yes | Yes |
| Report link | Always shown | Always shown | Always shown |

**Sections**

| Built today | Free | Pro | Team (not built) |
|---|---|---|---|
| Links, Spotlight, Moving banner, Photos, About me, Events, Watch and listen, Kind words, Questions, Socials and contact, My story, Latest posts, A little space, Title (14 kinds) | Yes | Yes | Yes |
| Shop, Services and prices, Bookings, Team (4 kinds) | Try only. A plain button can link to any of these for free | Yes | Yes |
| Tabs | Try only | Yes, up to 4 tabs (the schema's limit) | Yes |
| Sections on a page | 6 | No plan limit (schema allows 200 blocks) | No plan limit |
| Links inside a section | Unlimited | Unlimited | Unlimited |
| All layouts of an allowed section, hide a section, highlights (up to 2) | Yes | Yes | Yes |
| Scheduling a section | Try only | Yes | Yes |

**Design**

| Built today | Free | Pro | Team (not built) |
|---|---|---|---|
| Looks | 12, and the other 38 to try | All 50 | All 50, plus a shared team look once built |
| Colours from the look, plain white, dark | Yes | Yes | Yes |
| My colour, From my photo | Try only | Yes | Yes |
| Fonts | The look's own | Look's own and 8 pairings | Same as Pro |
| Button shape and fill | Yes | Yes | Yes |
| Background: the look's art, Paint it again, solid, soft fade | Yes | Yes | Yes |
| Background: a photo | Try only | Yes | Yes |
| Header layouts (6) and wordmarks (5) | Yes | Yes | Yes |
| Tondo mark (new, 1 day to build) | Shown | None | None |

**Photos and statistics**

| Built today | Free | Pro | Team (not built) |
|---|---|---|---|
| Uploaded photos (about 5 MB at 200 KB each on Free) | 25 | 2,000 | 2,000 a person |
| Views, clicks, top links, table view | Yes | Yes | Yes |
| Date range | 7 days | 7, 30, 90 today, all-time once built | Same as Pro, plus a team total once built |

**Planned, and the rows that matter most.** Every row of `features.md` is in the appendix.

| Planned | Free | Pro | Team |
|---|---|---|---|
| Sub-pages | 1 page, plus 1 unpublished draft to try | 10 pages | 10 a person, plus 25 on the team's own address |
| Custom domain | No | 1 | 1 a person |
| Remove the mark, favicon, footer logo | No | Yes (mark 1 day, others 1 day) | Yes |
| Contacts stored | 250, always exportable | 10,000 | 10,000 a person |
| Email broadcasts | No | 500 contacts, 2,000 sends a month | Same as Pro, per person |
| File downloads | 1 at 25 MB | 20 at 100 MB | 20 at 100 MB a person |
| Checkout on Shop and Services | No | 0% Tondo fee | 0% Tondo fee |
| Tips | 5% Tondo fee | 0% | 0% |
| Roles, invitation links, duplicate a page, shared look, team statistics | No | No | Yes |

## The 50 looks

**Free, 12:** Madder, Sap, Sumi, Lagoon, Lilac, Office, Indigo, Dusk, Fern, Volt, Signal, Tide.

I picked these after looking at each look's example page in `apps/marketing/public/shots`. Nobody has tried them with other content, so the choice should be checked during QA.

- **The rule.** `packages/render/src/looks` shows that 8 looks have no signature header of their own: Madder, Dusk, Sumi, Lagoon, Office, Signal, Tide and Volt. They are all free, which gives a clear reason for the split: a signature header is what Pro pays for. Sap, Lilac, Indigo and Fern do draw their own headers, and they join to widen the range, since they suit a florist, a yoga teacher, a consultant and a plant shop.
- **Madder stays free** because it's the default in `packages/page/src/samples.ts`, and carries the brand's painting.
- **The picker's own filters still work.** Using the logic in `LookPanel.tsx`, I worked out from each look's background that all 50 divide into 31 light, 14 dark and 5 colourful, and the 12 divide into 7, 3 and 2. So Free isn't only pale pages.
- **Purposes covered:** a person (Madder, Sumi), a musician (Dusk), a trainer (Volt), a podcast (Signal), a cause (Tide), a firm (Office), a professional (Indigo), a florist or shop (Sap, Fern), wellness (Lilac) and a creator (Lagoon).

**Pro, 38.** These are the looks with the strongest identity. The groups are mine, for reading, and aren't in the product.

- **Editorial and quiet:** Noir, Atelier, Vellum, Plaster, Brine, Press, Letterhead, Calm, Estate, Keys.
- **Food, craft and shops:** Bakehouse, Roast, Lume, Harvest, Wax, Shelf, Crumb, Biscuit, Comet.
- **Trades and local services:** Ledger, Second Street, Rivet, Smile, Trail, Surf, Postal.
- **Graphic and playful:** Bloom, Cutout, Riso, Lacquer, Ink, Rave, Pixel, Ticket, Scrapbook.
- **Community:** Rose window, Rovers, Stacks.

I'd keep Noir on Pro even though it's a likely favourite, because it's the kind of look a photographer would pay for. The cost of this split is that community groups have Tide and little else on Free, so Rose window, Rovers and Stacks may need a nonprofit answer. Liinks [offers no nonprofit discount](https://www.liinks.co/help/article/do-you-offer-discounts-for-non-profits), and it's listed below as a decision. Pricing page tiles also need changing, because it shows noir and bake as free.

The marketing site has to change with this. `pricing.astro` says "All 50 looks" in several places, and the gallery should say which looks need Pro.

## Pages per person

This is meant to be one of Pro's main selling points, and **it isn't built.** Today there's one page per person, and `findLive` only reads the main page. I'd follow the recommendation in `.scratchpad/multipage/notes.md`: sub-pages under one address, such as `tondo.page/maya/weddings`, before any second address.

| Plan | Pages | Addresses | Notes |
|---|---|---|---|
| Free | 1 live, plus 1 unpublished draft to try the idea | 1 | Sub-pages are worth trying before paying, as with looks |
| Pro | 10, including the main page. Drafts count | 1 | |
| Team | 10 a person, and up to 25 on the team's own address | 1 a person, plus the team's | Adds shared look, roles, invitations, duplicate and team statistics, none of it for sale until it's built |

**Why these numbers.** Pages are small, so cost isn't the limit. 10 reads as plenty for one person, and Choko's Plus lists up to 11. Liinks gives 5 profiles for $12, which are separate addresses, so this isn't like for like. Sub-pages sharing one address also means Pro doesn't replace Team: an agency can't sensibly put its clients under its own name. Evidence for charging is mixed. Beacons appears to give sub-pages away, while Lnk.Bio and Choko charge. Demand from regular people is unproven, as the notes say, which is why Pro doesn't depend on this alone.

**Slugs.** `pages.slug` and the `pages_user_slug` constraint already allow this, with no schema change. Slugs need their own `isValidSlug` and short reserved list, because `isReservedHandle` includes `about`, `contact`, `blog` and `store`, which are the words people will want. `tondo.page/maya/about` harms nothing, since only the first part collides with Tondo's routes.

**Adding a second page.** "Add a page" sits in the address card on Home. The person names it first, so the prompt shows the real address:

> tondo.page/maya/weddings can go live with Pro, for $6 a month, along with 9 more pages. You can build it now and decide when you publish. If you only need a few more sections on your main page, you don't need this.

Buttons, equal in weight: "Build it" and "See Pro". The draft holds that free slot, and a third page asks to remove the draft or go Pro. Publishing it opens the same panel as a paid look.

**On downgrade:** see the table under Behaviour at the limits. All pages stay live at the same address, with only the main page editable.

**Teams.** This assumes option C in [teams-schema.md](teams-schema.md), where a team is a `users` row and owns pages as a person does, so the 25 pages need no extra work and sub-pages apply to teams unchanged. That schema is still undecided. Its option B would move `plan` to `handles`, and `limitsFor` would read from there, with the limits themselves unchanged.

## The options

|  | A: Free with real limits, Pro, Team (recommended) | B: No free plan, with a trial | C: A lighter Free, Pro, Team |
|---|---|---|---|
| Price | Free $0. Pro $6 a month or $60 a year. Team $4 a person from 3 | No free plan. Solo $6 or $60, Studio $15 or $150 for 5 addresses | Free $0. Pro $6 or $60. Team $4 a person from 3 |
| Looks on the free tier | 12 | No free tier. All 50 to try and buy | 20 |
| Own colour and fonts on free | Look's colours and fonts only | Not applicable | Yes |
| Shop, Services, Bookings, Team, Tabs on free | No | Not applicable | Yes |
| Sections on free | 6 | Not applicable | No plan limit |
| Photos on free | 25 | Not applicable | 100 |
| Statistics on free | 7 days | Not applicable | 30 days |
| Pages | 1, 10 on Pro | 10 | 1, 10 on Pro |
| Mark | Free only | None | Free only |
| Trial | None needed. Try everything, pay to publish it. 14-day refund | 14 days from going live | None. 14-day refund |
| When a plan ends | Page stays live. Design steps down after 30 days | Page goes offline after 30 days | Page stays live. Design steps down after 30 days |
| Main risk | Free may feel tight next to Beacons and Milkshake | Loses free pages as advertising, and reverses what the site says | May not push enough people to pay, the owner's original concern |

### Option A: Free with real limits, Pro and Team (recommended)

As described above. Prices stay as they are on the site, because I found no reason to move them: with a custom domain, Campsite is $7, Beacons $10, Milkshake $8.33 to $10, and Liinks $12. Liinks's Starter at $5 is cheaper, without a domain. Team at $4 a person costs more per person than Liinks's $12 for 5 profiles, and has to earn that with roles and shared looks. The annual discount stays at 17%. There's a 14-day refund and no trial, since trying in the editor does what a trial would, and Checkout can add one later with one setting.

### Option B: No free plan, with a trial

The closest match to Liinks. You build for free for as long as you like. Going live starts a 14-day trial of Solo at $6 or $60 a year, or Studio at $15 or $150 a year for 5 addresses. Everything is included, with no mark and no looks to split, so it's by far the simplest to explain.

- **For:** every live page pays, so there's nothing free to host or moderate, and a card makes phishing harder (if a card is required, which is a decision). There's no design gating at all, which fits "beautiful design is the point". Liinks shows that someone can run on this model, though I don't know how it performs.
- **Against:** it reverses the site, which says a free plan is planned and everything is free today. It loses free pages as advertising and the mark that goes with them. It asks regular people for a commitment before anyone has visited. Linktree, Beacons, Campsite and Milkshake all have a free plan next to it, and those are the alternatives that people will see.
- **The conflict with live pages staying live:** without a free plan, an unpaid page has to stop. I'd give 30 days' notice and keep the content, and I wouldn't copy Liinks's immediate stop, but printed links would still break. Keeping an unpaid page online in some reduced form would just be a free plan. So B has to drop that promise.

### Option C: A lighter Free

Keeps more free: 20 looks (the 12 above plus Calm, Plaster, Vellum, Brine, Lume, Roast, Wax and Postal), own colours and fonts, all sections and Tabs, 100 photos and 30 days of statistics. Pro adds 30 signature looks, a photo background, no mark, 90 days of statistics, and pages and a domain when they're built.

- **For:** it can't be called stingy, sits closer to Beacons and Milkshake, and every free page has more freedom. Gating is a smaller build, about 3 days less.
- **Against:** it's near the original problem. Many people would have everything they need, and Pro's main day-one reason would be looks and the mark. I'd pick this only if testing shows A is off-putting.

## Behaviour at the limits

**The rule at every limit:** say what happened and what the person can do next, offer the free way out first or with equal weight, and don't repeat the prompt. No countdowns or pre-ticked trials, as in `.scratchpad/multipage/notes.md`.

| Moment | What the person sees | What the system does |
|---|---|---|
| Picking a Pro look, or scheduling a section | The look applies, as usual. The tile has a small Pro label. A quiet line under the panel: "Bakehouse is part of Pro. Try it as long as you like, and you'll be asked when you publish." | Saves to the draft. Drafts can hold anything |
| Own colour, fonts, photo background | Same: it works, with the same quiet line once | Saves to the draft |
| Adding Shop, Services, Bookings, Team or Tabs | It's added, with Pro beside it in the Add list. Bookings and Shop also say: "A plain button can link there for free." | Saves to the draft |
| A seventh section | Added, with one line: "Free pages go live with up to 6 sections." | Saves to the draft |
| **Publishing with any of these** | The panel lists each item: "Your page uses Bakehouse, your own colour and Shop, which are part of Pro." Two equal buttons: "Get Pro, $6 a month" and "Publish with free choices", which shows a preview first | `planIssues` returns them with stable codes |
| Publish with free choices | Preview in the nearest free look, with look's colours and fonts, and any Pro sections and any sections over 6 left off the live page. "Your draft keeps everything, so nothing is lost." | `stepDown` applies to the published copy only, the same way `liveContent` already leaves unfinished sections out and says so |
| 26th photo | "You've used your 25 photos. Remove one, or get 2,000 with Pro." | Upload refused with `plan_limit`, 413 as today |
| Analytics: pressing 30 or 90 days | "You can see 7 days on Free. Your views are still being counted, so older days will be here if you get Pro." | Server limits `statsFor`, and collecting doesn't stop |
| The mark | Page settings: "Free pages show a small Made with Tondo. Pro removes it." | |
| Adding a second page | See Pages per person | |

The server decides each of these, and the editor only displays them. Trying a paid look can't reach visitors, because publish is the only route to `published`.

## What a downgraded page shows

The earlier idea was that live pages stay live and everything on them stays as it was. That conflicts with gating: if a paid look stayed forever, someone could pay for one month, and never need to pay again for a page that rarely changes. Reverting at once would change someone's page without warning on the day a card fails.

**How I'd resolve it: the address and the content stay permanently, and the design steps down after 30 days.** A page never goes offline for a billing reason, every link and QR code keeps working, and the things people pay for stop being free.

| Item | When the plan ends | After 30 days |
|---|---|---|
| Address and visitors | Unchanged, and never stops | Unchanged |
| Mark | Returns | Stays |
| Paid look | Stays | Moves to a free look chosen in advance, or the nearest one |
| Own colour, font pairing, photo background | Stay | Go back to the look's own |
| Shop, Services, Bookings, Team, Tabs, sections over 6 | Stay visible | Stay visible, and can be edited and removed. New ones can't be added |
| Extra pages | Stay live, read-only | Stay live, read-only, with the design step-down. They can be unpublished or deleted, and an unpublished one can't return without Pro |
| Main page | Stays live and editable | Same |
| Custom domain, once built | Forwards to `tondo.page/handle` | Forwarding stops after 30 days, following an email |
| Photos over 25 | Stay visible, and new uploads wait | Same |
| Statistics | 7 days, nothing deleted | Same. Older days return on upgrading |
| Contacts over 250, once built | Stored and exportable, new sign-ups still arrive | Same |
| Draft | Keeps everything | Keeps everything, so upgrading restores the page at once |
| Scheduled sections | Keep their schedule | Same |
| Failed payment | Stays on the plan while Stripe retries, then as above | |
| Team ending | Each person's and the team's pages follow the same rules | |

Content stays because hiding someone's shop or links would harm their visitors, who can't see why. There's still a leak: someone can add Shop and Tabs for one month and keep them on a plain look with the mark. I'd accept that, since it costs very little and pages that can't grow are a reason to return. Liinks's rule is firmer and may convert better, and I have no data either way.

Stating this publicly is hard to take back, and it's listed as a decision. Pricing page text should be "your page stays online", and shouldn't imply that a paid look stays.

## Existing users

There are no real ones. [qa.md](qa.md) says nothing is deployed, and [roadmap.md](roadmap.md) puts a private release before paid plans. That makes this easier, but three things follow:

1. **Change the pricing page before anyone signs up.** It says "All 50 looks" and "Everything in Tondo is free today". Its FAQ promises to say so before Free changes. I haven't touched it, as asked. Its wording should change before the first deploy.
2. **Private release accounts get Pro free for 12 months after paid plans open,** then the normal rules with the 30 days. That's a small group, and the cost should be small. They'd be told in the invitation. This is a decision for the owner.
3. **Gates switch on with billing, not before.** Asking for a payment nobody can make would be a dead end, so until checkout works, every account behaves as Pro, with `PLANS_ON=false` deciding.

## Rough monthly margin

**These are estimates, and the inputs are mostly assumptions.** Each cell shows income / cost / margin. "Users" means accounts signed up. I recalculated every row with the same formula, so the reference row differs from the earlier version by a few dollars.

| Option | 100 users | 1,000 users | 10,000 users |
|---|---|---|---|
| A, if 2% pay Pro and 0.2% are teams of 4 | $14 / $52 / **-$38** | $139 / $138 / **$1** | $1,393 / $499 / **$895** |
| A, if 4% and 0.4% (the planning guess) | $28 / $54 / **-$26** | $279 / $153 / **$125** | $2,787 / $649 / **$2,138** |
| A, if 6% and 0.4% | $39 / $55 / **-$16** | $389 / $166 / **$223** | $3,887 / $774 / **$3,113** |
| B, half the sign-ups, 10% Solo and 1% Studio of those | $34 / $54 / **-$20** | $338 / $144 / **$193** | $3,375 / $556 / **$2,819** |
| C, if 2% and 0.2% | $14 / $52 / **-$38** | $139 / $138 / **$1** | $1,393 / $499 / **$895** |
| Earlier generous plan, if 3% and 0.3%, for reference | $21 / $53 / **-$32** | $209 / $146 / **$63** | $2,090 / $574 / **$1,516** |

- **The conversion figures are guesses.** I have nothing to set them by. I assumed A converts better than C because it withholds more, and that's only reasoning. A might also lose sign-ups, and that isn't modelled. I gave B half the sign-ups to stop it being flattered, and that's a guess too.
- **Fixed cost dominates early.** At about $5 of monthly income per Pro subscriber after fees, it takes about 11 subscribers to cover $51 of hosting. At 4% that's about 275 accounts.
- **Tighter Free limits save almost nothing,** because photos and looks cost next to nothing to serve. The case for limits is income, and not cost.
- **Not modelled:** any effect of the mark, of 7-day statistics, or of the free pages lost under B. The method is under "How I worked out the estimates".

## What Tondo would pay

These are estimates built from listed prices, and they haven't been checked against a real bill.

| Supplier | Listed price | How it applies to Tondo | Source |
|---|---|---|---|
| Neon | Launch: $0.106 per CU-hour, $0.35 per GB-month, 500 GB egress included, no minimum | Always-on 0.25 CU is about $19 a month. Public pages read the database today, so scale to zero may rarely apply. Pages and daily counts should stay small, though I haven't measured real pages | [Pricing](https://neon.com/pricing) |
| Render | Pro workspace $25 a month. 0.5 CPU instance $7, 1 CPU instance $25. Hobby includes 5 GB, Pro 25 GB, then $0.15 per GB. 15 custom domains on Pro, then $0.25 a month each | **Bandwidth is the main per-user cost**, because the server sends pages and photos. Instance prices come from Render's own articles and search summaries, since its pricing page gave no readable figures | [Bandwidth](https://render.com/docs/outbound-bandwidth), [domains](https://render.com/docs/custom-domains), [plans](https://render.com/changelog/updated-plans-for-render-workspaces), [Node hosting](https://render.com/hosting/nodejs) |
| Cloudflare R2 | $0.015 per GB-month, 10 GB free, free egress | A full Free account of 25 photos at about 200 KB is about 5 MB, or under $0.001 a month. **So the photo limit is there to separate the plans and limit abuse, and has almost no effect on cost** | [Pricing](https://developers.cloudflare.com/r2/pricing/) |
| Cloudflare for SaaS | 100 custom hostnames included, then $0.10 each. The page doesn't state the period, and I've assumed monthly | An alternative to Render's domains, and it would also cache in front of the server. Not evaluated in depth | [Plans](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/) |
| Resend | Sending: free 3,000 a month and 100 a day, $20 for 50,000, then $0.90 per 1,000. Broadcasts: free 1,000 contacts, then $40 for 5,000, $80 for 10,000 | **Broadcasts are the one cost that could exceed a plan's price.** At $0.008 a contact, a 1,000 person list costs more than Pro earns. The repo hasn't chosen an email provider, so Resend is an example | [Pricing](https://resend.com/pricing) |
| Stripe | 2.9% + CA$0.30 per card, +0.8% international, +2% if currency is converted. Billing 0.7%. Tax 0.5% where registered. Disputes CA$15 | The pricing page served Canadian rates, and its US figures couldn't be read. Linktree's help quotes 2.9% + $0.30. On $6 a month this is about $0.52, or 8.6%. On $60 a year, about $2.46, or 4.1%. **Yearly billing pays about half the fee percentage** | [Pricing](https://stripe.com/en-ca/pricing), [Billing](https://stripe.com/en-ca/billing/pricing) |

### How I worked out the estimates

- **Page views:** 300 a month for a free account and 1,500 for a paid one. These are guesses, and the largest unknown here.
- **Weight per view:** 0.4 MB, with no CDN. Example pages measured 12 to 14 KB of HTML on the local server, and carry a median of 3 photos. I counted about 2 photos at 200 KB per view, allowing for repeat visits, since photos are cached for a year. Fonts come from Google.
- **Stripe:** 4.6% + $0.30, which is card plus Billing plus a 1% allowance for international cards, with half of people billed yearly. I treated the fixed fee as US$0.30, which is high if the account is Canadian.
- **Hosting:** $51 a month at 100 accounts, $89 at 1,000 and $152 at 10,000, plus Resend's $20 from 1,000 accounts. At 10,000 this assumes two instances, and [deploy.md](deploy.md) notes that rate limits and caches are per instance today.
- **Not counted:** my time, support, refunds, disputes, sales tax handling, accounting, the domain, backups or anything at launch that needs a paid Neon feature.


## What regular people expect, and what they pay for

I didn't interview anyone, so this is read from what products give away and charge for. It shows what companies chose, which isn't the same as what people want.

**What's normal to get for free.** Linktree, Campsite and Milkshake offer unlimited links. Themes and basic statistics are common. A free tier is the norm for this kind of page, with Liinks, Stan and possibly Shorby as the exceptions.

**What gets charged for.** Custom domains, removing branding, more profiles or pages, longer statistics, lower seller fees and marketing tools recur across these pages. Paid themes and backgrounds appear at Linktree and Campsite.

**Which gates seem fair or hostile.** This is my judgement.

| Gate | My view | Why |
|---|---|---|
| Custom domain, more pages, seats | Fair | They're clearly extra, and a domain has a real cost |
| Removing the mark | Fair if the mark is small | The person is trading a little space for free hosting |
| Signature looks, photo background | Fair if the free looks stay lovely | An earlier version of this page called this wrong for Tondo. It's what lets existing work be worth paying for, and free pages stay well designed |
| Own colour | Debatable | The strictest gate here. Free still has each look's colours, plain white and dark |
| Long-term statistics | Fair | Recent numbers are still free |
| Exporting your own contacts | Hostile | It's the person's list, and being able to leave builds trust |
| Three-month minimum (Taplink) | Hostile for small amounts | It's more commitment than a page of links needs |
| Live pages stopping after a lapsed plan (Liinks) | Hostile | These links are printed and posted where people can't update them, and Liinks's own help says printed QR codes stop too |

**Where Tondo can be different.**

- **A live page never goes offline because a plan ended.** Liinks does the opposite, and most others don't state a rule.
- **Try every look and setting on your own page before paying.** I couldn't find a competitor that describes this, though I couldn't see inside their editors.
- **No tracking on any plan.** The privacy policy says Tondo stores no IP addresses, referrers, locations or visitor cookies, and pages send no JavaScript. Campsite and Stan sell pixels, and Liinks includes them. Marketers who rely on pixels won't choose Tondo, which is the cost of this position. Traffic sources would need the privacy policy to change first, and I'd count referring sites only, as daily totals, and leave out country.

The earlier claim that every look is free no longer applies, and shouldn't be used.

## Build sketch for option A

No Stripe account has been touched, and no app code has changed. This uses the guidance in the `stripe:stripe-best-practices` skill, which lists API version `2026-09-30.endive` and the Node SDK at 23.0.0.

### Data

```sql
ALTER TABLE users ADD COLUMN plan text NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN stripe_id text UNIQUE;
ALTER TABLE users ADD COLUMN design_until timestamptz;
```

`plan` and `stripe_id` are the two columns [data-model.md](data-model.md) already planned. `design_until` is new. The webhook sets it to the period's end plus 30 days when a plan ends, and clears it on upgrading. Sub-pages need no schema change. Under option C in [teams-schema.md](teams-schema.md), a member's plan is read from the team's row.

### `apps/server/src/limits.ts`

It stays the only place that knows plans.

```ts
export type Plan = "free" | "pro" | "team";

export interface Limits {
    /** Live pages, including the main page. */
    pages: number;
    /** Unpublished pages allowed on top, to try the idea before paying. */
    draftPages: number;
    /** On a page. Null is no limit beyond the schema's. */
    sections: number | null;
    photos: number;
    /** Null is all-time. */
    statsDays: number | null;
    contacts: number;
    design: boolean; // all looks, own colour, fonts, photo background
    business: boolean; // Shop, Services, Bookings, Team, Tabs, scheduling
    domain: boolean;
    mark: boolean;
    csv: boolean;
}

const PLANS: Record<Plan, Limits> = {
    free: { pages: 1, draftPages: 1, sections: 6, photos: 25, statsDays: 7, contacts: 250, design: false, business: false, domain: false, mark: true, csv: false },
    pro: { pages: 10, draftPages: 0, sections: null, photos: 2000, statsDays: 90, contacts: 10000, design: true, business: true, domain: true, mark: false, csv: true },
    team: { pages: 10, draftPages: 0, sections: null, photos: 2000, statsDays: 90, contacts: 10000, design: true, business: true, domain: true, mark: false, csv: true },
};

// A team's own row (option C in teams-schema.md) holds more pages than one person.
const TEAM_ADDRESS_PAGES = 25;

export function limitsFor(account: { id: string; plan: Plan; designUntil: Date | null }, now = new Date()): Limits {
    const base = PLANS[account.plan];
    const pages = account.id.startsWith("team:") ? TEAM_ADDRESS_PAGES : base.pages;
    // The 30 days after a plan ends: the design stays, while everything else is already Free.
    const kept = account.designUntil !== null && now < account.designUntil;
    return { ...base, pages, design: base.design || kept };
}

export const canAddPage = (limits: Limits, count: { total: number }) =>
    count.total < limits.pages + limits.draftPages;

export const canPublishPage = (limits: Limits, count: { live: number }, isLive: boolean) =>
    isLive || count.live < limits.pages;

/** Worked out, not stored: on one page, only the main page can be edited. */
export const isReadOnly = (limits: Limits, page: { slug: string; published: unknown }) =>
    limits.pages === 1 && page.slug !== "" && page.published !== null;
```

- `limitsFor` replaces today's unused user id, and its only caller is `photos.ts:102`.
- The server stays the decider, for creating a page, publishing and saving a read-only page. `GET /api/v1/me` returns `plan`, `limits` and the page count, so the editor shows the same numbers. Refusals return the stable code `plan_limit`.
- The statistics route in `apps/server/src/pages.ts` accepts 7, 30 or 90 from anyone today, so it needs clamping to `statsDays`.

### Shared rules in `packages/page/src/plan-rules.ts`

The editor, the publish check and the live page all need the same answers, and `packages/page` can't import server code, so it takes the two booleans and no plan name:

- `FREE_LOOKS`, and `freeLookFor(look)`, a small table of the nearest free look.
- `paidUses(page, { design, business, sections }, livePage)` returns a list of `{ code, target, label }`. A paid section already on the live page, found by block id, doesn't count, which is how a downgraded person can still edit one. There's no new storage.
- `stepDown(page, allowance)` returns a copy with a free look, the look's colours and fonts and no photo background. `keepContent` decides whether paid sections stay: yes on a downgrade, and no for "Publish with free choices".

### The publish check

`planIssues` in `limits.ts` is already called from `serverIssues` in `apps/server/src/pages.ts`, for both the check and the publish. It becomes `planIssues(draft, limits, live)`, and turns `paidUses` into issues. `PublishIssue` gains an optional `plan: true`, so `PublishPanel.tsx` can show those in their own group with the two buttons, instead of among things to fix. "Publish with free choices" sends a flag, the server stores `stepDown` of the draft as `published`, and the draft stays as it is.

### The live page

`renderDocument` gets `mark` as an option next to `reportLink`, since `packages/render` shouldn't know about plans. The live lookup in `apps/server/src/app.ts` reads `plan` and `design_until`, applies `stepDown` when design isn't kept, and a plan change drops that person's cached pages. A cached page can be out of date by `PAGE_CACHE_MS`, which is 15 seconds.

### The editor

| Where | Change |
|---|---|
| `LookTiles` in `LookPanel.tsx` (also used by `StartFlow.tsx`) | A small Pro label on 38 tiles, drawn in CSS on the tile. Free first under All, within the existing mix. No dimming, because they all still work |
| `MakeItYours` | Pro label on My colour, From my photo, the 8 pairings and A photo |
| `AddList` in `Panels.tsx` | Pro label on the 5 sections, with the note on using a plain button |
| `PublishPanel.tsx` | The new group and buttons, with the preview |
| `AnalyticsPage.tsx` | 30 and 90 stay visible, and open the prompt on Free |
| Photo picker | Remove a photo, with a new `DELETE` route in `photos.ts` |
| Home's address card, once sub-pages exist | Add a page, and the page switcher from `notes.md` |

### Sub-pages

As model A in `.scratchpad/multipage/notes.md`: `GET /:handle/:slug`, `POST /api/v1/me/pages`, `:id` on draft, publish, unpublish and stats, cache keyed by handle and slug, editor backups keyed by page id, a page switcher, `isValidSlug` and a page reference on links.

### Stripe objects

- **One Product per plan:** Tondo Pro and Tondo Team. Each has a monthly and a yearly Price, found by lookup key, such as `pro_month`. Stripe advises against several tiers on one Product and against the old `plan` object.
- **Keys:** a restricted key, `rk_`, on a `StripeClient` instance. Separate sandboxes for development and CI, instead of the shared test mode.

### Routes, all in `apps/server/src/billing.ts`

| Route | What it does |
|---|---|
| `POST /api/v1/billing/checkout` | Signed in. Creates the customer if there's no `stripe_id`, and saves it first. Then creates a Checkout Session with `mode: "subscription"`, the chosen Price, a success URL and `integration_identifier`. It doesn't pass `payment_method_types`, so Stripe can choose methods from Dashboard settings |
| `POST /api/v1/billing/portal` | Signed in. Creates a Customer Portal session and redirects. The portal handles cards, invoices, monthly and yearly changes, and cancelling at the end of the period |
| `POST /api/stripe/webhook` | Not signed in. Verifies the signature against the raw body, so it needs its own route with no JSON parsing, and is left out of the rate limit that protects people |

The success page only says "Your plan is being updated" and reads `/me`. **The plan changes only through the webhook.**

### Webhooks

Webhooks are required for subscriptions. One function handles the lifecycle events and is safe to repeat: find the user by the event's customer id against `stripe_id`, fetch the customer's current subscription from Stripe, and write `plan`. Fetching the current state means events arriving out of order or twice do no harm, so no events table is needed.

| Event | Action |
|---|---|
| `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid` | Run the sync |
| `invoice.payment_failed` | Run the sync, and tell the person to update their card |
| `charge.dispute.created`, `charge.refunded`, `radar.early_fraud_warning.created` | Notify the owner. Decide case by case at this size |

`active` and `past_due` count as paid, and `canceled`, `unpaid`, `paused` and `incomplete` count as Free. Smart Retries and the end-of-retry outcome are set in the Dashboard. Also, `removeUser` must cancel any subscription when an account is deleted, and the portal must not offer a plan with no working features.

**Tax needs a decision.** `automatic_tax` collects nothing until a registration is active, and it gives no error, so it should be turned on only once registrations exist. Which registrations are needed is a question for an accountant, as is the Stripe account's country and whether USD prices are settled without conversion.


### Home's sidebar

`apps/editor/src/app/nav.ts` says items only appear once their feature works and never move, so **there's no new nav item and no upgrade button.** The Account page gains a Plan section, with Manage billing opening the portal. One quiet line above Help says "Free plan", or "Pro" with no badge or colour. On a phone it's in the More menu.

### Other work

- `apps/marketing/src/pages/pricing.astro`: the Free column, "All 50 looks", its tiles, "One page, with tabs" and the FAQ. Also the gallery and `/teams`. I haven't changed these.
- Terms, privacy, refund wording, and `deploy.md` for the new variables. Stripe becomes a named processor.
- `boundaries.json`: the `stripe` package belongs in `apps/server` only.
- Emails for a plan ending need a provider, and [roadmap.md](roadmap.md) hasn't chosen one yet. Stripe's own emails could cover the first version.
- `.docs/README.md` describes this file as four options, and `.scratchpad/multipage/notes.md` says Liinks states no downgrade rule. I left both, as they weren't part of this task, and another agent is working in this tree.

### Rough size for one developer

These are my estimates, and they assume the code stays as it is.

| Work | Size |
|---|---|
| Columns, `limits.ts`, `/me`, error code, clamped statistics | 2 to 3 days |
| `plan-rules.ts`, `stepDown`, free look table, tests | 2 days |
| Pro labels in picker, Make it yours and Add list | 1 to 2 days |
| Publish panel group, free choices preview | 2 days |
| Mark, design and render. Live page step-down and cache | 2 days |
| Photo delete route and picker | 1 day |
| **Gating** | **About 2 weeks** |
| Checkout, portal, webhook, sync, `design_until`, tests in a sandbox | 4 to 5 days |
| Account's Plan section, sidebar line, pricing page, terms | 2 to 3 days |
| **Billing, and a Pro with day-one value** | **3 to 4 weeks in total** |
| Sub-pages, per `notes.md` | 2 to 3 weeks more, so 5 to 7 weeks in total |
| All-time statistics, CSV, favicon, footer logo | 2 to 3 days |
| Custom domains, including the hosting choice and forwarding | 1 to 2 weeks |
| Team, per [teams-schema.md](teams-schema.md) | 1.5 to 5 weeks of schema work depending on its option, plus 2 to 3 weeks of screens and invitations |

## Decisions for the owner

1. **Which option.** I recommend A, with C as the fallback.
2. **The 12 free looks.** Please check the names against what you'd be happy to see everywhere. Whether Noir stays on Pro is the likeliest thing to change.
3. **Own colour on Free.** I've gated it, the most aggressive choice here. Allowing it would soften Free and weaken Pro for businesses.
4. **7 days of statistics.** Your suggestion, and shorter than any free plan I read. 14 would match Campsite.
5. **Whether Pro launches with sub-pages.** I'd wait for them if pages are a key selling point, which makes launch about 5 to 7 weeks away. Custom domains then follow as Coming. Charging earlier means selling looks, colour and sections alone.
6. **The downgrade rule.** Address and content stay permanently, and design steps down after 30 days. I'd state this publicly, since it's hard to take back.
7. **Private release.** 12 months of Pro free, as proposed.
8. **Nonprofits and community groups.** A discount, or a few more free looks, or nothing, as at Liinks.
9. **Refund or trial.** I propose a 14-day refund and no trial.
10. **Pixels.** None on any plan, with referring sites only, which needs a privacy policy change.
11. **Stripe account and tax.** Which country and entity holds the account, and when to register for tax, with an accountant's advice.
12. **Hosting for custom domains.** Render or Cloudflare for SaaS, which [roadmap.md](roadmap.md) already leaves open.
13. **The questions at the end of [teams-schema.md](teams-schema.md).** The 25 team pages assume its option C.

## What I couldn't confirm

- **Liinks:** the list under "What Liinks really does". Nothing was tried. The owner's signed-in view can settle most of it, and I didn't touch the browser.
- **Linktree:** current prices don't appear in the text of its own page, so they come from PricingSaaS's captures. Its help conflicts on fonts, and its pricing page and help conflict on removing the logo. Previewing a locked theme, and what happens to one after a downgrade, are unknown.
- **Beacons:** which plan has which background, and which plan removes the logo, because third parties disagree and its table is hard to read. Its help page has no date.
- **Later:** its help centre returned 403, so its branding and design details come through search summaries. Whether it still has a free tier is unclear: its marketing says the tool is free, and its pricing page lists none.
- **Stan, Shorby, Taplink, Lnk.Bio, Campsite:** as noted in the table. Stan's prices come from its own article, Shorby's from a stale review, Taplink's from G2 and Lnk.Bio's partly from third parties.
- **Conversion:** nothing here says how many people will pay, on any option.
- **The look split:** I viewed each look only on its own example page, and not with anyone's real content.
- **Example page measures:** fictional pages, written to show range.
- **Render and Stripe:** instance prices come from Render's articles and summaries, the US rate page served Canadian figures, and Connect's full costs weren't checked.

## Appendix: every feature in `features.md`

Free, Pro and Team under option A. "Later" means it isn't priced until it's designed, usually because it has a per-use cost such as AI or video. "None" means no plan offers it. Most of this isn't built. What is built is in the gating table above.

### Building a page

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Unlimited links and blocks | 1 | Unlimited links, 6 sections | No plan limit | No plan limit |
| Link blocks to a URL or email | 1 | Yes | Yes | Yes |
| Rich link previews | 2 | Yes | Yes | Yes |
| Image, emoji and icon thumbnails | 1 | Yes | Yes | Yes |
| Grid, carousel and highlight layouts | 1 | Yes | Yes | Yes |
| Scrollable banners | 1 | Yes | Yes | Yes |
| Rich text | 1 | Yes | Yes | Yes |
| Header blocks | 1 | Yes | Yes | Yes |
| Dividers | 1 | Yes | Yes | Yes |
| Video | 1 | Yes | Yes | Yes |
| Audio and music | 1 | Yes | Yes | Yes |
| GIFs | 1 | Yes | Yes | Yes |
| General embeds | 2 | Yes | Yes | Yes |
| File downloads | 2 | 1 at 25 MB | 20 at 100 MB | 20 at 100 MB a person |
| FAQs | 1 | Yes | Yes | Yes |
| Testimonials | 1 | Yes | Yes | Yes |
| Resume | 1 | Yes | Yes | Yes |
| Maps | 1 | Yes | Yes | Yes |
| Contact details download (vCard) | 1 | Yes | Yes | Yes |
| Countdown timer | 1 | Yes | Yes | Yes |
| Price labels on links | 1 | Yes | Yes | Yes |
| Folders that collapse | 1 | Yes | Yes | Yes |
| Tabs | 1 | Try only | Up to 4 tabs | Up to 4 tabs |
| Sub-pages | 4 | 1 page, plus 1 draft to try | 10 pages | 10 a person, 25 on the team's address |
| Multi-page websites | 9 | Later | Later | Later |
| Search on the page | 4 | Yes | Yes | Yes |
| Sections and columns | 1 | Yes | Yes | Yes |
| Starter pages per profession | 1 | Yes | Yes | Yes |
| Build a page before signing up | 2 | Yes | Yes | Yes |

### Scheduling and link behaviour

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Show and hide on a schedule | 1 | Try only | Yes | Yes |
| Priority or highlighted links | 1 | Yes | Yes | Yes |
| Animations to draw attention | 1 | Yes | Yes | Yes |
| Send visitors straight to one link for a time | 4 | No | Yes | Yes |
| Link redirects | 4 | No | Yes | Yes |
| Link directly to a tab | 4 | No | Yes | Yes |
| Links per social post | 3 | No | Yes | Yes |
| Automatic links from Instagram captions | 3 | No | Yes | Yes |
| Up to five links per post | 3 | No | Yes | Yes |

### Design

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Themes | 1 | 12 of 50, the rest to try | All 50 | All 50 |
| Custom colours | 1 | Look's colours, plain, dark | Own colour, from a photo | Same as Pro |
| Custom fonts | 1 | Look's own | 8 pairings, uploads later | Same as Pro |
| Background gradients, photos, patterns | 1 | Art, solid, soft fade | Adds a photo | Same as Pro |
| Button shape and corners | 1 | Yes | Yes | Yes |
| Section spacing | 1 | Yes | Yes | Yes |
| Per-block styling | 1 | Yes | Yes | Yes |
| Animated avatars | 4 | No | Yes | Yes |
| Custom footer logo | 4 | No | Yes | Yes |
| Remove Tondo branding | 4 | No | Yes | Yes |
| Favicon | 4 | No | Yes | Yes |
| Logo creation | 10 | Later | Later | Later |
| Generated artwork | 1 | Yes | Yes | Yes |

### Publishing, domains and search

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Personal address | 1 | Yes | Yes | Yes |
| Custom domains | 4 | No | 1 | 1 a person |
| Domains for product pages | 6 | No | Yes | Yes |
| SEO title and description | 4 | Yes | Yes | Yes |
| Share title, text and image | 4 | Yes | Yes | Yes |
| Pinterest site verification | 4 | Yes | Yes | Yes |
| Verification badge | 4 | No | Yes | Yes |
| Report link on free pages | 2 | Yes | Yes | Yes |

### Sharing and QR

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Share button | 4 | Yes | Yes | Yes |
| QR code for the page | 4 | Yes | Yes | Yes |
| Unlimited dynamic QR codes | 4 | No | Yes | Yes |
| QR scan tracking | 4 | No | Yes | Yes |
| Change a QR destination later | 4 | No | Yes | Yes |
| Styled QR codes with a logo | 4 | Yes | Yes | Yes |
| Branded short links | 4 | No | Yes | Yes |
| UTM link builder | 4 | No | Yes | Yes |
| Apple Wallet card | 10 | Later | Later | Later |
| NFC card | 10 | Later | Later | Later |

### Statistics and tracking

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Page views and link clicks | 2 | 7 days | Yes | Yes |
| Per-link statistics | 2 | 7 days | Yes | Yes |
| All-time and custom date ranges | 4 | No | Yes | Yes |
| Traffic sources and audience insights | 4 | No | Yes | Yes |
| Real-time statistics | 4 | No | Yes | Yes |
| Sales statistics | 6 | No | Yes | Yes |
| Google Analytics | 4 | None | None | None |
| Meta pixel | 4 | None | None | None |
| TikTok and Pinterest pixels | 4 | None | None | None |
| Pixels for seven ad platforms | 4 | None | None | None |
| Data export | 4 | No | Yes | Yes |

### Forms and audience

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Email sign-up | 2 | Yes, 250 contacts | 10,000 contacts | 10,000 a person |
| Forms with custom fields | 2 | 1 form | Yes | Yes |
| Mailchimp sync | 4 | No | Yes | Yes |
| Contact list | 2 | 250 | 10,000 | 10,000 a person |
| Contact import and export | 7 | Export only | Both | Both |
| Audience groups | 7 | No | Yes | Yes |
| Lead magnets | 7 | No | Yes | Yes |
| Email broadcasts | 7 | No | 500 contacts, 2,000 sends a month | Same as Pro, per person |
| Automated sequences | 7 | No | Yes | Yes |
| Email templates and mobile builder | 7 | No | Yes | Yes |
| Sending from your own domain | 7 | No | Yes | Yes |
| Geotargeting and personalisation | 7 | None | None | None |
| Purchase-triggered emails | 7 | No | Yes | Yes |
| Instagram auto-DM | 7 | Later | Later | Later |

### Messaging and contact

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| WhatsApp, Messenger, Telegram, Viber, Skype buttons | 1 | Yes | Yes | Yes |
| Phone and email buttons | 1 | Yes | Yes | Yes |
| Social icons, 40+ platforms | 1 | Yes | Yes | Yes |
| Requests from fans | 6 | No | Yes | Yes |

### Integrations and feeds

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Instagram posts and reels | 3 | Yes | Yes | Yes |
| TikTok videos | 3 | Yes | Yes | Yes |
| YouTube feed | 3 | Yes | Yes | Yes |
| Spotify, Apple Music, SoundCloud, Bandcamp | 1 | Yes | Yes | Yes |
| RSS and Atom | 2 | Yes | Yes | Yes |
| WordPress | 2 | Yes | Yes | Yes |
| Apple Podcasts | 2 | Yes | Yes | Yes |
| Shopify and Etsy product feeds | 3 | No | Yes | Yes |
| Calendly | 2 | Yes | Yes | Yes |
| Cal.com | 2 | Yes | Yes | Yes |
| Bandsintown | 3 | Yes | Yes | Yes |
| Cameo, GoFundMe | 2 | Yes | Yes | Yes |
| Merch: Bonfire, Amaze, Spring | 3 | No | Yes | Yes |
| Link app marketplace | 10 | Later | Later | Later |
| Live event embeds | 2 | Yes | Yes | Yes |

### Teams and platform

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Many profiles under one account | 5 | No | No | Yes |
| Login links for managed profiles | 5 | No | No | Yes |
| Duplicate a profile | 5 | No | No | Yes |
| Shared themes across profiles | 5 | No | No | Yes |
| Team members and roles | 5 | No | No | Yes |
| Public REST API | 5 | No | Yes | Yes |
| MCP server for AI assistants | 5 | No | Yes | Yes |
| Import from Linktree, Beacons and others | 5 | Yes | Yes | Yes |
| Referral program | 5 | Yes | Yes | Yes |
| Free plan | 2 | Yes | Not applicable | Not applicable |
| Free trial | 4 | None | None, refund in 14 days | None |

### Payments and store

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Sell digital downloads | 6 | No | 0% fee | 0% fee |
| Sell physical products | 6 | No | 0% fee | 0% fee |
| Sell services | 6 | No | 0% fee | 0% fee |
| Tips and donations | 6 | 5% fee | 0% fee | 0% fee |
| Affiliate products | 3 | Yes | Yes | Yes |
| Stripe and PayPal payouts | 6 | For tips | Yes | Yes |
| Apple Pay and Google Pay | 6 | For tips | Yes | Yes |
| 20+ currencies | 6 | For tips | Yes | Yes |
| Discount codes | 6 | No | Yes | Yes |
| Limited quantity offers | 6 | No | Yes | Yes |
| Upsells and order bumps | 6 | No | Yes | Yes |
| Payment plans, Klarna, Affirm, Afterpay | 6 | No | Yes | Yes |
| Custom terms | 6 | No | Yes | Yes |
| Product importer | 6 | No | Yes | Yes |
| Selling through your own affiliates | 9 | Later | Later | Later |
| Marketing images for products | 9 | Later | Later | Later |

### Booking

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Link to a booking page | 1 | Plain button | Bookings section | Bookings section |
| Embedded booking | 2 | No | Yes | Yes |
| Native time slots and calendar | 8 | No | Yes | Yes |
| Paid sessions | 8 | No | Yes | Yes |
| Multiple calendars | 8 | No | Yes | Yes |

### Creator business

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| Courses | 9 | Later | Later | Later |
| Course statistics | 9 | Later | Later | Later |
| Memberships and subscriptions | 9 | Later | Later | Later |
| Communities | 9 | Later | Later | Later |
| Webinars | 9 | Later | Later | Later |
| Auto-updating media kit | 9 | Later | Later | Later |
| Rate cards, past projects, gated access | 9 | Later | Later | Later |
| Sharing a media kit by PDF | 9 | Later | Later | Later |
| Invoices | 9 | Later | Later | Later |
| Brand deals and outreach | 9 | Later | Later | Later |
| Affiliate brand network | 10 | Later | Later | Later |

### AI

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| AI chat help | 10 | Later | Later | Later |
| AI text generation | 10 | Later | Later | Later |
| AI image generation | 10 | Later | Later | Later |
| AI page designer | 10 | Later | Later | Later |
| AI email generation | 10 | Later | Later | Later |
| Trending content search | 10 | Later | Later | Later |
| Bio generator | 10 | Later | Later | Later |

### Beyond the web page

| Feature | Phase | Free | Pro | Team |
|---|---|---|---|---|
| iOS and Android apps | 10 | Later | Later | Later |
| Social post scheduling | 10 | Later | Later | Later |
| Free tools: QR, bio, signature, UTM, favicon generators | 10 | Yes | Yes | Yes |
| Google Workspace, onboarding, in-person events | 10 | Later | Later | Later |

## Sources

Competitor sources are in the tables above. Others used:

- [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks.md), [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal.md)
- [Render free instances](https://render.com/docs/free), [compute plans](https://render.com/docs/compute-plans)
- Repo: `apps/marketing/src/pages/pricing.astro`, `apps/marketing/src/pages/privacy.astro`, `apps/server/src/limits.ts`, `apps/server/src/photos.ts`, `apps/server/src/pages.ts`, `apps/editor/src/components/LookPanel.tsx`, `apps/editor/src/app/nav.ts`, `packages/render/src/looks`, `.scratchpad/multipage/notes.md`, `.docs/teams-schema.md`
