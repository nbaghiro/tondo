# Feature list

This is everything Tondo should eventually support, taken from the products in [competitors.md](competitors.md) and from Tondo's own plans. Check it when designing anything, so early decisions don't block later features. Almost none of this is built, and the phases are a proposed order, not a commitment.

**Who has it:** Li Liinks, LT Linktree, Be Beacons, St Stan, La Later, Sh Shorby. Blank means none of these showed it, so it's Tondo's own idea. A feature counts when any source showed it, and competitors.md explains why.

**Phases**

| Phase | Theme |
|---|---|
| 1 | Core page building |
| 2 | Collecting from visitors and bookings by embed |
| 3 | Connected accounts and feeds |
| 4 | Publishing and growth tools |
| 5 | Teams, API and importing |
| 6 | Payments and store |
| 7 | Audience: email and automations |
| 8 | Tondo's own booking |
| 9 | Creator business: courses, memberships, media kit |
| 10 | Beyond the web page |

## Building a page

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Unlimited links and blocks | Li LT Be St Sh | No limit in the schema beyond a sanity cap | 1 |
| Link blocks to a URL or email | Li LT Be St La Sh | `button`, `link-card` | 1 |
| Rich link previews | Sh | Filled in by a server fetch when a link is pasted | 2 |
| Image, emoji and icon thumbnails | Li | `link-card` variants and icon picker | 1 |
| Grid, carousel and highlight layouts | Li | Variants | 1 |
| Featured banner | La | `feature` | 1 |
| Scrollable banners | La | `gallery` carousel variant | 1 |
| Rich text | Li LT Be | `text` | 1 |
| Header blocks | LT | `heading` | 1 |
| Dividers | Li | `divider` | 1 |
| Video | Li LT Be St Sh | `video` | 1 |
| Audio and music | Li LT Be | `music` | 1 |
| GIFs | Sh | Allowed in `image` and `link-card` | 1 |
| General embeds | Li LT Be Sh | `embed`, approved providers | 2 |
| File downloads | Li Be St | `file` | 2 |
| FAQs | Li | `faq` | 1 |
| Testimonials | Li | `reviews` | 1 |
| Resume | Li | `timeline` | 1 |
| Maps | LT | `location` | 1 |
| Contact details download (vCard) | Li LT | `contact` | 1 |
| Countdown timer | Be Sh | `countdown` | 1 |
| Price labels on links | Sh | `link-card` field | 1 |
| Folders that collapse | Li | `section` with collapse | 1 |
| Tabs | Li | `tabs` | 1 |
| Sub-pages | Be | Pages under one profile, see "Decisions to protect" | 4 |
| Multi-page websites | Be | Same as sub-pages, with navigation | 9 |
| Search on the page | Li | Page option. Needs a small script | 4 |
| Sections and columns | | Containers | 1 |
| Starter pages per profession | LT Be | Starters | 1 |
| Build a page before signing up | Sh Li | Editor works without an account, as the experiment does | 2 |

## Scheduling and link behaviour

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Show and hide on a schedule | Li LT Be Sh | Shared block control | 1 |
| Priority or highlighted links | LT | Shared highlight control | 1 |
| Animations to draw attention | Li | Part of highlight, a small designed set | 1 |
| Send visitors straight to one link for a time | Li | Page setting, checked by the server | 4 |
| Link redirects | Be | Same redirect table | 4 |
| Link directly to a tab | Li | Addresses such as `/maya/shop`, server-rendered | 4 |
| Links per social post | La | Page of post images, each with its links | 3 |
| Automatic links from Instagram captions | Li | Feed job reads captions | 3 |
| Up to five links per post | La | Same as above | 3 |

## Design

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Themes | Li LT Be St La | Looks | 1 |
| Custom colours | Li LT Be St La Sh | Paint, plus colour choices | 1 |
| Custom fonts | Li LT Be St La | Font pairings. Uploaded fonts later | 1 |
| Background gradients, photos, patterns | Li LT Be La Sh | Page background options, plus paint | 1 |
| Button shape and corners | Li LT Be | Button shape choice | 1 |
| Section spacing | Li | A designed compact, normal or roomy choice | 1 |
| Per-block styling | Li | Block variants and the highlight control. Deliberately not free colour per block | 1 |
| Animated avatars | Sh | Video or GIF in the header | 4 |
| Custom footer logo | Li | Page setting on paid plans | 4 |
| No Tondo branding on any plan | LT Be | Decided 2026-11-01: nothing to remove | 4 |
| Favicon | Be | Page setting | 4 |
| Logo creation | Be | Generated from the art system | 10 |
| Generated artwork | | Art recipes, Tondo's own feature | 1 |

## Publishing, domains and search

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Personal address | Li LT Be St La Sh | Handles | 1 |
| Custom domains | Li LT Be St Sh | Domain table and certificates | 4 |
| Domains for product pages | Be | Same table, by path | 6 |
| SEO title and description | LT Be La | Page settings | 4 |
| Share title, text and image | Li | Page settings, plus generated art image | 4 |
| Pinterest site verification | Li | Page setting that adds the meta tag | 4 |
| Verification badge | Li | Reviewed by hand at first | 4 |
| Report link on live pages | | Abuse handling | 2 |

## Sharing and QR

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Share button | Li | Page option | 4 |
| QR code for the page | Li LT Be | Generated on the server | 4 |
| Unlimited dynamic QR codes | Li | Points at the redirect table | 4 |
| QR scan tracking | Li | Redirect counts | 4 |
| Change a QR destination later | Li | Redirect table | 4 |
| Styled QR codes with a logo | Li | QR renderer in the look | 4 |
| Branded short links | Sh | Redirect table | 4 |
| UTM link builder | Li | Field on links | 4 |
| Apple Wallet card | Be | Signed pass | 10 |
| NFC card | Be | Physical product through a supplier | 10 |

## Statistics and tracking

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Page views and link clicks | Li LT Be St La Sh | Server-side counts | 2 |
| Per-link statistics | Li LT Be St La Sh | Redirect counts | 2 |
| All-time and custom date ranges | Li LT Be La | Daily rollups | 4 |
| Traffic sources and audience insights | LT Be | Referrer and country in aggregate | 4 |
| Real-time statistics | Be | Same data, shorter window | 4 |
| Sales statistics | Be St | Orders table | 6 |
| Google Analytics | Li LT Be St La Sh | Added only if the person turns it on | 4 |
| Meta pixel | Li LT Be St Sh | Same | 4 |
| TikTok and Pinterest pixels | Be St | Same | 4 |
| Pixels for seven ad platforms | Sh | Same, one list of providers | 4 |
| Data export | | CSV | 4 |

## Forms and audience

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Email sign-up | Li LT Be St | `signup` | 2 |
| Forms with custom fields | Li LT Be | `form` | 2 |
| Mailchimp sync | LT La | Audience connection | 4 |
| Contact list | Be St | `contacts` table, shared by forms and sales | 2 |
| Contact import and export | Be St | CSV | 7 |
| Audience groups | Be | Tags | 7 |
| Lead magnets | St | `signup` that delivers a `file` | 7 |
| Email broadcasts | Be St | Email provider | 7 |
| Automated sequences | Be St | Scheduled jobs | 7 |
| Email templates and mobile builder | Be | Editor reuse | 7 |
| Sending from your own domain | Be | Provider domain verification | 7 |
| Geotargeting and personalisation | Be | Contact fields | 7 |
| Purchase-triggered emails | Be | Order events | 7 |
| Instagram auto-DM | Be St | Instagram messaging permissions. Needs its own review | 7 |

## Messaging and contact

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| WhatsApp, Messenger, Telegram, Viber, Skype buttons | Sh | `contact` | 1 |
| Phone and email buttons | Sh Li | `contact` | 1 |
| Social icons, 40+ platforms | LT | `social`, with a full icon set | 1 |
| Requests from fans | Be | `form` variant, paid requests in phase 6 | 6 |

## Integrations and feeds

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Instagram posts and reels | Li LT La Sh | `gallery` and `video` source | 3 |
| TikTok videos | LT | `video` source | 3 |
| YouTube feed | LT Sh | `video` source | 3 |
| Spotify, Apple Music, SoundCloud, Bandcamp | LT | `music` | 1 |
| RSS and Atom | Sh | `posts` source | 2 |
| WordPress | Sh | `posts` through RSS | 2 |
| Apple Podcasts | Sh | `posts` through RSS | 2 |
| Shopify and Etsy product feeds | Sh LT | `products` source | 3 |
| Calendly | LT | `booking` embed | 2 |
| Cal.com | | `booking` embed | 2 |
| Bandsintown | LT | `events` source | 3 |
| Cameo, GoFundMe | LT | `link-card` with recognised icon | 2 |
| Merch: Bonfire, Amaze, Spring | LT | `products` link-out, sources later | 3 |
| Link app marketplace | LT | Recognised-link list first, third-party apps much later | 10 |
| Live event embeds | Be | `embed` | 2 |

## Teams and platform

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Many profiles under one account | Li Sh LT | Workspace with many profiles | 5 |
| Login links for managed profiles | Li | Signed invitation | 5 |
| Duplicate a profile | Li | Copies page JSON | 5 |
| Shared themes across profiles | Li (coming soon) | Team look | 5 |
| Team members and roles | Sh | `member` roles | 5 |
| Public REST API | Li | Generated from `contract` and block schemas | 5 |
| MCP server for AI assistants | Li | Same operations as the API | 5 |
| Import from Linktree, Beacons and others | Li La | Page parsers | 5 |
| Referral program | Li Sh | Referral codes | 5 |
| Free plan: build and preview 1 page, none live | Li | Plan limits | 2 |
| Free trial | Li St Sh | Billing | 4 |

## Payments and store

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Sell digital downloads | LT Be St | `products` with checkout, Stripe Connect | 6 |
| Sell physical products | LT | `products` with shipping fields, or link-out | 6 |
| Sell services | LT St | `services` with checkout | 6 |
| Tips and donations | LT Be | `tip` | 6 |
| Affiliate products | LT Be La | `link-card` with tracked links | 3 |
| Stripe and PayPal payouts | LT Be St | Stripe first, PayPal later | 6 |
| Apple Pay and Google Pay | Be | Through Stripe | 6 |
| 20+ currencies | Be | Through Stripe | 6 |
| Discount codes | Be St | Orders | 6 |
| Limited quantity offers | Be St | Product stock | 6 |
| Upsells and order bumps | Be St | Checkout step | 6 |
| Payment plans, Klarna, Affirm, Afterpay | Be St | Through Stripe, plan availability to check | 6 |
| Custom terms | Be | Product field | 6 |
| Product importer | Be | From Shopify and Etsy sources | 6 |
| Selling through your own affiliates | St | Affiliate table | 9 |
| Marketing images for products | Be | Generated from art | 9 |

## Booking

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Link to a booking page | LT St | `booking` level 1 | 1 |
| Embedded booking | LT | `booking` level 2 | 2 |
| Native time slots and calendar | St Be | `booking` level 3 | 8 |
| Paid sessions | LT St | Level 3 with payments | 8 |
| Multiple calendars | Be | Calendar sync | 8 |

## Creator business

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| Courses | Be St | New product kind, course player, video hosting | 9 |
| Course statistics | St | Course tables | 9 |
| Memberships and subscriptions | LT Be St | Recurring Stripe billing, gated pages | 9 |
| Communities | St | Large. Possibly a partner | 9 |
| Webinars | St | Product kind with an embed provider | 9 |
| Auto-updating media kit | Be | Page kind using connected accounts | 9 |
| Rate cards, past projects, gated access | Be | Media kit blocks | 9 |
| Sharing a media kit by PDF | Be | Print rendering | 9 |
| Invoices | Be | Payments | 9 |
| Brand deals and outreach | Be | Large, depends on the media kit | 9 |
| Affiliate brand network | Be | Partner network. A business deal more than a feature | 10 |

## AI

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| AI chat help | Li Be | Assistant using the same operations as the API | 10 |
| AI text generation | Be | Field-level writing help | 10 |
| AI image generation | Be | Library option. Galleo has code to reuse | 10 |
| AI page designer | Be | Generates a page from a short description | 10 |
| AI email generation | Be | With phase 7 email | 10 |
| Trending content search | Be | Low priority | 10 |
| Bio generator | Li | Text generation | 10 |

## Beyond the web page

| Feature | Who has it | How Tondo supports it | Phase |
|---|---|---|---|
| iOS and Android apps | LT Be | Possibly Expo, like Smallwares, on the public API | 10 |
| Social post scheduling | La | A separate product. Decide later whether to build it at all | 10 |
| Free tools: QR, bio, signature, UTM, favicon generators | Li | Marketing pages using existing code | 10 |
| Google Workspace, onboarding, in-person events | Be | Business offers, not software | 10 |

## Decisions to protect

These are choices we have to get right early, because each list above depends on them.

1. **User and page.** A user has one address and one or more pages, and a page holds tabs. Blocks belong to a page. Sub-pages, websites and media kits all fit this. Teams and several addresses per person will move the address into its own table, as [data-model.md](data-model.md) describes.
2. **One way to track links.** Link clicks, short links, QR codes, redirects and "skip to one link" are all the same thing: an address that counts and forwards. Links on a page are worked out from its live copy, standalone ones get one `links` table in phase 4, and all counts go in `stats`. See [data-model.md](data-model.md).
3. **One contacts table.** Sign-ups, forms and purchases all add to it, so email, automations and exports have one source.
4. **Generic feed sources.** Instagram, YouTube, RSS, Shopify and Bandsintown all follow one interface: connect, fetch, save items. Blocks read saved items and don't know the provider.
5. **Products with kinds.** Link-out, download, physical, service, course and membership are kinds of one product, so `products` doesn't get replaced when selling arrives.
6. **Plan checks in one place.** Every limit is checked by a single function from day one, because almost every feature here ends up tied to a plan.
7. **Operations through one layer.** The editor, public API, MCP server, importers and AI all change pages through the same block operations and the same schemas. So those operations belong in shared code.
8. **Page requirements declared.** Blocks already declare scripts and embeds. Page settings such as pixels and search have to declare them too, so the security policy can be built from them.

## Conflicts to settle

- **Tracking pixels and privacy.** Pixels are expected by marketers, but they set cookies and send visitor data to ad platforms. That conflicts with Tondo's current no-cookie, no-profile plan. The proposal is that they stay off unless a person adds one, and a page with pixels shows a consent notice where the law needs it. This needs legal checking.
- **Free styling and designed options.** Liinks sells detailed per-link styling. Tondo's rule is designed options only. That's a deliberate difference, and we may lose some customers over it.
- **Scope.** Beacons and Stan are large companies' worth of product. Phases 7 to 10 will need real decisions, including what to leave out, even though everything is listed here.
- **Instagram personal accounts.** Later says any Instagram profile works for its links, including personal ones, while the API that reads media needs a professional account. How Later does this hasn't been checked.
