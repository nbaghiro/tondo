# What the assistant can change: block, section, header and look reference

This is the reference behind [ai-chat.md](ai-chat.md). It describes the code as it stood on 2026-11-01, read from `packages/page/src` and `packages/render/src` and checked by loading `blockDefinitions`, `sectionDefinitions` and `looks` in a script. When a block changes, the source wins and this file needs updating. The plan proposes generating the assistant's catalogue from the same definitions, so the prompt can't drift the way this page can.

**How to read the columns**

- **Limits** are the zod limits. Every text limit is a maximum in characters. A list limit is the most rows.
- **Held** means the block or option renders on saved pages, but needs something that isn't built. The shelf hides it and `publishIssues` refuses it.
- **AI writes** lists what the model may set freely, such as wording it was asked to draft.
- **Person's facts only** lists fields where an invented value would be a false claim. The server refuses them unless the value can be traced to the person's messages, their page or a site they gave. [ai-chat.md](ai-chat.md#the-facts-guard) explains the check.
- Every block's `id` and every list item's `id` is assigned by code and never by the model, because statistics, form answers and undo rely on them.

## Controls every block shares

| Field | Value | How a person asks |
|---|---|---|
| `variant` | The block's layouts, below | "Show my services as a menu" |
| `hidden` | True or left out | "Hide the shop for now" |
| `showFrom`, `showUntil` | Exact UTC instant | "Show the sale until Friday night" |
| `highlight` | True or left out. `MAX_HIGHLIGHTS` is 2 per page | "Make this link stand out" |
| `section` | Id set by code. Neighbours with the same id are one section | Never asked for directly |
| `tint` | True or left out, draws a soft band of the page's colour | "Put the prices on a coloured band" |

The section operations apply `hidden`, `showFrom`, `showUntil` and `tint` to a whole section through `setSectionShared`. `highlight` is per block, and `duplicateBlock` and `duplicateSection` drop it from the copy.

## The 30 block types

### Words

| Type | Layouts | Fields and limits | AI writes | Person's facts only | How a person asks |
|---|---|---|---|---|---|
| `heading` Heading | `plain`, `large` | `text` 60 | `text` | None | "Call this section Lessons", "make the title bigger" |
| `text` Text | `plain`, `card` | `text` 600. Addresses become links when drawn | `text`, following what the person said | Any claim inside the words. Links in it count as links | "Write a few lines about me", "shorten this" |
| `ribbon` Ribbon | `moving`, `still`, `wave` | `text` 60 | `text` | Dates and offers | "Add a moving banner saying new work on Friday" |
| `divider` Divider | `space`, `line`, `paint` | None | Layout | None | "Add some space before the shop" |

### Actions

| Type | Layouts | Fields and limits | AI writes | Person's facts only | How a person asks |
|---|---|---|---|---|---|
| `button` Button | `filled`, `outline` | `url` link, `text` 40 | `text` | `url` | "Add a button to my shop", "make that outlined" |
| `link-card` Link card | `small`, `icon`, `large`, `over`, `side` | `url` link, `title` 70, `text` 160, `photo` (not on `icon`), `cta` 24 and `tag` 18 (`large`, `over`, `side` only) | `title`, `text`, `cta`, `tag` | `url`, prices and dates in the words | "Feature my autumn sale at the top with a big photo" |
| `contact` Contact and social | `icons`, `buttons`, `list` | `items` 12: `type` (10 link types, below), `value` link | `type`, layout | `value` | "Add my WhatsApp and email", "show those as icons" |

### Media

| Type | Layouts | Fields and limits | AI writes | Person's facts only | How a person asks |
|---|---|---|---|---|---|
| `image` Photo | `full`, `framed`, `round`, `arch` | `photo`, `caption` 80, `alt` 140, `url` link | `caption`, `alt` from what it can see or was told | `url` | "Use this as a big arched photo" |
| `gallery` Gallery | `grid`, `mosaic`, `carousel` | `photos` 24, each with `caption` 60 (schema only, not in the panel). `source` `manual`. `count` 3, 6 or 9 applies only to held sources | Layout, order, removal | Which photos. Only uploads or choices the person picked | "Show these as a swipe gallery" |
| `video` Video | `card`, `vertical`, `row` | `items` 8: `url` link, `title` 70, `meta` 24, `cover`. `source` `manual` | `title` when the link names it, layout | `url`, `meta` | "Add my YouTube video" |
| `music` Music | `compact`, `full` | `url` link, `title` 50, `sub` 50, `cover`, `tracks` 12: `name` 50, `length` 6 (`full` only). It opens the link and plays nothing itself | Layout | All of the rest | "Add my new album from Spotify" |
| `posts` Posts | `list`, `cards` | `items` 10: `url` link, `title` 70, `date` 20, `text` 90. `source` `manual`. `count` 3, 5 or 10 applies only to held `rss` | `text` when summarising a real post | `url`, `title`, `date` | "List my last three articles" |
| `file` File, **held** | `card` | `file` name 200 and size, `title` 60, `sub` 40 | Nothing. Needs file delivery | Everything | The assistant says it isn't available yet |

### Selling

| Type | Layouts | Fields and limits | AI writes | Person's facts only | How a person asks |
|---|---|---|---|---|---|
| `products` Products | `grid`, `carousel` | `items` 24: `photo`, `name` 50, `price` 24, `url` link | Layout, rewording a real name on request | `name`, `price`, `url`, `photo` | "Add my three prints with prices" |
| `services` Services | `list`, `menu`, `tiers` | `items` 20: `name` 40, `detail` 60, `price` 24, `url` link, `included` 240 and `popular` (`tiers` only). `cta` 14, not on `menu` | Layout, `cta`, wording of `detail` | `name`, `price`, `url`, `popular` | "Add my menu", "show these as price plans" |
| `booking` Booking | `card`. **Held:** `calendar`, `slots` | `url` link, `title` 50, `sub` 60, `cta` 24. `slots` 12 of 12 chars is schema only | `title`, `sub`, `cta` | `url` | "Add my Calendly" |
| `events` Events | `list`, `next`, `schedule` | `items` 30: `name` 50, `at` local time (not on `schedule`), `label` 14 (`schedule` only), `place` 50, `url` link. `cta` 12. Past events drop off by themselves | Layout, `cta` | `name`, `at`, `label`, `place`, `url` | "Add my tour dates", "just show the next one" |
| `countdown` Countdown | `large`, `inline` | `at` local time, `label` 40, `done` 50 | `label`, `done` | `at` | "Count down to the launch on the 14th" |
| `tip` Tip, **held** | `amounts`, `single` | `title` 40, `sub` 70, `amounts` 4 of 6 chars, `cta` 24, `raised` 14, `goal` 14. `progress` is schema only | Nothing. Needs payments | Everything | The assistant says it isn't available yet, and can link to a payment page with a button |

### Collecting

| Type | Layouts | Fields and limits | AI writes | Person's facts only | How a person asks |
|---|---|---|---|---|---|
| `signup` Email sign-up, **held** | `card`, `plain` | `title` 40, `sub` 120, `cta` 14 | Nothing. Needs storage and email | Everything | The assistant says it isn't available yet, and can link to a newsletter elsewhere |
| `form` Form, **held** | `card` | `title` 40, `sub` 120, `questions` 8: `label` 40, `kind` (`text`, `long`, `email`, `phone`, `choice`), `options` 300. `cta` 14 | Nothing. Needs storage and email | Everything | The assistant says it isn't available yet |

### Details

| Type | Layouts | Fields and limits | AI writes | Person's facts only | How a person asks |
|---|---|---|---|---|---|
| `quotes` Quotes | `large`, `card`, `carousel` | `items` 12: `text` 180, `by` 50. The panel says to use real words from people who agreed | Layout | `text` and `by`, word for word | "Add this review: ..." |
| `logos` Logos | `row` | `label` 40, `items` 12: `name` 24, `logo` | `label` | `name`, `logo` | "Say I've been in the Morning Post and The Local" |
| `stats` Numbers | `row` | `items` 4: `number` 8, `label` 18 | Shortening `label` | `number` and what it counts | "Show 12 years, 400 clients" |
| `team` Team | `circles`, `list` | `items` 12: `photo`, `name` 30, `role` 40, `url` link | Layout | Everything else | "Add Ana, who runs the front desk" |
| `faq` Questions | `accordion` | `items` 20: `question` 80, `answer` 300 | `question`. `answer` only from what the person told it, or from their site | Facts in `answer` | "Add a question about shipping: we ship across Canada" |
| `timeline` Timeline | `line` | `items` 12: `title` 50, `date` 24, `detail` 90 | Wording of `detail` | `title`, `date`, facts | "Turn my CV into a timeline" (with the CV pasted) |
| `location` Location | `hours`, `map`, `both`. The map is a drawing that opens directions | `address` 70, `note` 50, `hours` 7: `days` 18, `time` 22 (not on `map`) | Layout | `address`, `note`, `hours` | "Add my opening hours: Tuesday to Friday, 7 to 4" |
| `embed` Embed, **held** | `tap` | `url` link, `title` 50, `cover` | Nothing. Needs the per-page security policy | Everything | The assistant says it isn't available yet, and offers a link instead |
| `tabs` Tabs | `pills` | `tabs` 2 to 4: `label` 16, `blocks` up to 60 leaf blocks. Tabs can't hold tabs | Labels, moving sections between tabs | None | "Split this into Shop and About" |

**Held options on available blocks:** `booking` layouts `calendar` and `slots`, `gallery` sources `instagram` and `tiktok`, `video` sources `youtube` and `tiktok`, and `posts` source `rss`. A request for one of these gets a plain "not available yet" and the nearest thing that works, such as a video link in place of a YouTube feed.

**Link types** in `contact.items.type` and `header.links.type`: `instagram`, `tiktok`, `youtube`, `spotify`, `apple`, `globe`, `mail`, `phone`, `chat`, `pin`. `readLink` recognises Instagram, TikTok, YouTube, Vimeo, Spotify, Apple Music, SoundCloud, Calendly, Cal.com, Etsy, Shopify, Substack, WhatsApp, Telegram and maps, and it turns a bare email or phone number into `mailto:` or `tel:`. X, LinkedIn and Facebook links route to the contact section through `routeLink`, and show with the `globe` icon.

**Link and photo rules.** `linkValue` allows only `https://`, `http://`, `mailto:` and `tel:`, or empty while a page is a draft. A photo is `{ file, x?, y?, zoom? }`, where `file` is a demo photo's name or an upload's path and can't be a full address. `x` and `y` are 0 to 100, and `zoom` is 1 to 3. `paint-N` is a drawn stand-in that publishing warns about.

**What publishing requires** (`publishIssues`): a name, no empty social icon, a link for the header button if it has text, something to show, no held block or layout, a link on `button`, `link-card`, `music`, `booking`, `embed`, on each `video` and `products` row, and a value on each `contact` row. The server also refuses `BLOCKED_HOSTS`.

**What the live page leaves out** (`liveContent`): any field still holding its sample words. Nothing is stored to say what's been touched, since each field is compared with what it could have started as. So any value written by the model counts as the person's own and goes live. That's why the facts guard exists, and why [ai-chat.md](ai-chat.md#filling-sample-content) adds sample sections through `makeSection` unchanged.

## The sections

A section is what a person sees. It's one or more blocks with the same `section` id, often with a heading as its title. Its kind is worked out by `sectionsOf`, not stored. There are 22 definitions, of which 18 can be added today: 14 appear in the main list and 8 are marked `less`, and the 4 marked unavailable below have only held styles. `TITLE` is a hidden 23rd kind for a lone heading on an older page.

### The 14 main sections

| Key | Name | Default title | Styles, as `id` → block `variant` | Available | How a person asks |
|---|---|---|---|---|---|
| `links` | Links | None | `buttons` → `button filled`, `outline` → `button outline`, `cards` → `link-card small`, `icons` → `link-card icon` | Yes | "Add my website and shop" |
| `spotlight` | Spotlight | None | `large` → `link-card large`, `over` → `link-card over`, `side` → `link-card side` | Yes | "Put my sale at the top, big" |
| `banner` | Moving banner | None | `wave` → `ribbon wave`, `moving` → `ribbon moving`, `still` → `ribbon still` | Yes | "Add a banner about Friday's opening" |
| `photos` | Photos | None | `grid`, `mosaic`, `carousel` → `gallery`. `one` → `image framed`, with a shape choice of `framed`, `full`, `round`, `arch` | Yes | "Add a photo gallery" |
| `about` | About me | A little about me | `plain` → `text plain`, `card` → `text card` | Yes | "Add a section about my story" |
| `shop` | Shop | Shop | `grid`, `carousel` → `products` | Yes | "Add a shop", "move the shop up" |
| `services` | Services and prices | What I offer | `list`, `menu`, `tiers` → `services` | Yes | "Add my prices", "add my menu" |
| `bookings` | Bookings | None | `card` → `booking card`. **Held:** `calendar`, `slots` | Yes | "Let people book a call" |
| `events` | Events | Coming up | `list`, `next`, `schedule` → `events`. `countdown` → `countdown large`, with a choice of `large`, `inline` | Yes | "Add my dates" |
| `media` | Watch and listen | None | `card`, `vertical`, `row` → `video`. `music` → `music full`, with a choice of `full`, `compact` | Yes | "Add my video", "add my album" |
| `proof` | Kind words | None | `quote` → `quotes large`, with a choice of `large`, `card`. `carousel` → `quotes carousel`. `stats` → `stats row`. `logos` → `logos row` | Yes | "Add this quote" |
| `questions` | Questions | Good to know | `faq` → `faq accordion` | Yes | "Add some questions and answers" |
| `find` | Socials and contact | None | `buttons` → `contact buttons`, with a choice of `buttons`, `list`. `icons` → `contact icons`. `place` → `location both`, with a choice of `both`, `map`, `hours` | Yes | "Add my opening hours", "add my phone number" |
| `touch` | Stay in touch | None | **Held:** `card`, `plain` → `signup`, `form` → `form card` | **No** | "Collect emails" gets "not available yet" |

### The 8 less common sections

| Key | Name | Default title | Styles | Available | How a person asks |
|---|---|---|---|---|---|
| `team` | Team | Who you'll work with | `circles`, `list` → `team` | Yes | "Add my team" |
| `story` | My story | My story | `line` → `timeline line` | Yes | "Add a timeline of my work" |
| `posts` | Latest posts | Latest posts | `list`, `cards` → `posts` | Yes | "List my articles" |
| `download` | Download | None | **Held:** `file` → `file card` | **No** | "Add my PDF" gets "not available yet" |
| `tip` | Tip jar | None | **Held:** `amounts`, `single` → `tip` | **No** | "Add a tip jar" gets "not available yet" |
| `embed` | Embed | None | **Held:** `embed` → `embed tap` | **No** | "Embed my Typeform" gets "not available yet" |
| `tabs` | Tabs | None | `pills` → `tabs pills` | Yes | "Split the page into two tabs" |
| `space` | A little space | None | `line`, `space`, `paint` → `divider` | Yes | "Add a line here" |

**How section operations behave.** `addSection` and `moveSection` count sections, not blocks. `setSectionStyle` keeps the content when the new style is the same block type, converts between link styles, and otherwise replaces the content with the new style's samples. The editor keeps a map of earlier blocks in `state/document.ts`, so trying a style and coming back loses nothing. The assistant needs the same protection, so it should refuse a style change that would swap in samples over the person's own content, and say why.

## The header

| Field | Values and limits | AI writes | Person's facts only | How a person asks |
|---|---|---|---|---|
| `layout` | `look` (This look's own), `centred`, `left`, `full` (Full photo), `arch`, `banner` | Yes | None | "Centre the top of my page" |
| `wordmark` | `bubble`, `poster`, `script`, `paint`, `seal`, or left out for plain text. Drawn from the name, no image model involved | Yes | None | "Turn my name into a logo", "try the script one" |
| `name` | Required, 80 | When asked | The name itself | "My name's Maya Okafor" |
| `tagline` | 120 | Yes | Claims in it | "Say I'm a ceramicist in Vancouver" |
| `bio` | 280 | Yes, from what it was told | Claims in it | "Rewrite my bio warmer" |
| `photo` | Photo value. Empty is fine | Crop values, a picked image | The photo | "Use this as my photo" |
| `links` | 12 rows of `type` and `value` | `type` | `value` | "Add my Instagram icon" |
| `buttonText`, `buttonUrl` | 40, link. Behind "More options" | `buttonText` | `buttonUrl` | "Add a main button to book" |

**Signature headers.** A look's own header (the "Own header" column below) draws only from these fields, and `layout: "look"` is what shows it. Any other layout replaces the signature, so the assistant should keep `look` unless asked.

**Name and about.** A "bio" request means `header.bio` unless the page has an About section and the person points at it. If both exist and the request is unclear, the assistant asks.

## Page-level fields

| Field | Values | AI writes | How a person asks |
|---|---|---|---|
| `title` | 70, for browser tabs and link previews. Left out uses the name | Yes | "What shows when I share my link?" |
| `description` | 160 | Yes | Same |
| `look` | One of 50, below | Yes | "Try something darker" |
| `paint` | 1 to 6 hex colours | Yes | "Paint it in warm oranges" |
| `seed` | Integer from 1. The editor picks 1 to 998 | Yes | "Paint me another one" |
| `style` | Make it yours, below | Yes | "Make the buttons softer" |
| `timeZone` | Set from the browser | **No** | Not asked for |
| `unreadable` | Blocks set aside | **No, and never sent to the model** | Support handles these |

**A catch with paint.** `header.ts` and `photoStandIns` use `theme ? paintFor(theme) : (page.paint ?? look.palette)`, so `paint` has no effect once `style.colour` is set. `setLook` also removes `paint`, `seed` and every style choice except a `brand` or `photo` colour. So painted art palettes need the assistant to clear `style.colour` first or tell the person, and to set the look before the paint.

## Make it yours

| Choice | Values | Labels on screen | How a person asks |
|---|---|---|---|
| `colour.mode` with `colour.brand` | `preset` a colour suggested by the look, `brand` their own hex, `photo` taken from their photo, `plain` near white, `dark` | Look's own is `style.colour` left out | "Use my brand colour #0a8f5c", "make it dark", "use the colours in my photo" |
| `font` | `editorial`, `elegant`, `quiet`, `modern`, `clean`, `bold`, `friendly`, `handmade` | Warm and classic, Elegant, Quiet, Modern, Clean, Bold, Friendly, Handmade | "Use a friendlier font" |
| `shape` | `square`, `soft`, `round` | Square, Soft, Round. Sets button and corner radius | "Make the buttons softer", "round the corners" |
| `fill` | Left out is filled, `outline`, `soft` | Filled, Outline, Soft | "Make the buttons less heavy" |
| `bg` | `solid`, `gradient`, `photo`, with `bgPhoto` | Solid, Soft fade, A photo | "Put my photo behind the page" |

**Things the assistant has to handle:**

- "Softer buttons" is ambiguous: `shape: "soft"` changes corners, and `fill: "soft"` changes weight. Set `shape` first, say which was changed, and offer the other in one line.
- `makeTheme` adjusts the brand colour when buttons would be unreadable, and `themeOf(page).changed` reports it. The summary should say so: "Your green is a little darker on buttons so the text stays readable."
- `colour.mode: "photo"` uses `brandFromPhoto` in `apps/editor/src/lib/photo-colour.ts`, which runs in the browser. The server can't call it, so Phase 1 leaves this as a client step or skips it.
- `strongColourLooks` lists the looks whose character depends on their colours, marked `*` below. A new colour changes these the most, so the assistant should warn before recolouring one.
- Custom colours per block aren't offered, by decision. The assistant says so and suggests `tint` or a highlight.

## The 50 looks

A look sets colours, fonts, shapes, art and sometimes a signature header. All 50 are free under the recommended plan. The code holds no mood or industry words for looks, so the "Example page" column is the best evidence of what each one suits. The assistant's catalogue should add one hand-written line of intent per look, which is a small job for the owner to review. The Colourful, Dark and Light filters in `LookPanel.tsx` are worked out from `--bg` and are enough for "something darker".

`*` marks `strongColourLooks`. The table was generated from the code.

| Look id | Label | Background | Button | Display font | Corner | Own header | Example page it was made for |
|---|---|---|---|---|---|---|---|
| `madder` | Madder | #fdf6f2 | #a42a55 | Fraunces | 20px | No | Maya Okafor |
| `dusk` | Dusk | #121832 | #f4effb | Instrument Serif | 22px | No | Noor Haddad |
| `sumi` | Sumi | #f8f8f5 | #15151a | Shippori Mincho | 2px | No | Lena Sato |
| `sap` | Sap | #eef2e3 | #17331f | Gloock | 22px | Yes | Aster & Bell, June Aster, Rae Bell |
| `indigo` | Indigo | #f3f5f7 | #1b2f7d | Young Serif | 4px | Yes | Priya Raman |
| `bake` * | Bakehouse | #fff7ec | #c8362b | Caprasimo | 24px | Yes | Harbour Bakery |
| `noir` | Noir | #0d0c0b | #f4efe7 | Bodoni Moda | 6px | Yes | Theo Lindqvist |
| `signal` * | Signal | #ffe100 | #0c0c0c | Archivo Black | 14px | No | Small Rooms |
| `surf` * | Surf | #fff1d6 | #ca4d29 | Shrikhand | 18px | Yes | Low Tide Surf |
| `roast` | Roast | #2b1710 | #e8a75d | Abril Fatface | 20px | Yes | Slow Pour Coffee |
| `lilac` | Lilac | #ece6f6 | #4a3b8f | Gilda Display | 30px | Yes | Stillwater Yoga |
| `fern` | Fern | #163a2c | #d7e88a | Newsreader | 14px | Yes | Understory |
| `atelier` | Atelier | #efd9d2 | #3a1320 | Italiana | 0px | Yes | Second Act |
| `vellum` | Vellum | #faf6ef | #6d7a55 | Cormorant Garamond | 2px | Yes | Ines & Tomas |
| `plaster` | Plaster | #e9e3d9 | #8a5a3c | Cormorant Garamond | 0px | Yes | Hana Ito Interiors |
| `lagoon` | Lagoon | #e8f6f5 | #07636f | Syne | 18px | No | Kai Mercer |
| `tide` * | Tide | #0f6e70 | #ffd25e | Literata | 16px | No | Clean River Project |
| `brine` | Brine | #dfe8ea | #1d3640 | Marcellus | 2px | Yes | The Salt House |
| `lume` | Lume | #f5efdd | #5a6220 | DM Serif Display | 10px | Yes | Osteria Lume |
| `harvest` | Harvest | #f3e8d0 | #b5301f | Stardos Stencil | 3px | Yes | Greengage Farm |
| `wax` | Wax | #14100b | #e7b768 | Cormorant SC | 4px | Yes | Alder and Wick |
| `shelf` * | Shelf | #6b1420 | #e7b23c | Rozha One | 4px | Yes | Marginalia Books |
| `press` | Press | #f6f1e4 | #c1272d | Newsreader | 0px | Yes | The Margin |
| `postal` * | Postal | #f4ead9 | #c94f2c | Courgette | 6px | Yes | Hablemos |
| `counsel` | Letterhead | #f8f6f0 | #21493b | Libre Baskerville | 0px | Yes | Separation is hard. The paperwork doesn't have to be. |
| `calm` | Calm | #dfe7dd | #2f5243 | Lora | 16px | Yes | I'm Amara. I help adults through anxiety, grief and big changes. |
| `ledger` * | Ledger | #f3f7e9 | #163524 | IBM Plex Mono | 2px | Yes | Tally and Co |
| `estate` * | Estate | #101c33 | #c9a35b | Libre Caslon Display | 3px | Yes | Clara Voss |
| `office` | Office | #f7f4ec | #23201a | Fraunces | 12px | No | Field Office |
| `bloom` * | Bloom | #c4412a | #fff4e4 | Bricolage Grotesque | 20px | Yes | Oskar Bloom |
| `cutout` | Cutout | #fbf6ea | #d73d29 | DM Serif Text | 0px | Yes | Juno Park |
| `riso` | Riso | #f3ecdc | #de2e45 | Bowlby One | 0px | Yes | The Night Ferries |
| `nix` | Lacquer | #fff7f4 | #c9182f | Playfair Display | 16px | Yes | Studio Nix |
| `comet` * | Comet | #fff3df | #e21279 | Bungee | 16px | Yes | Taco Comet |
| `second` | Second Street | #14251e | #e4b04a | Alfa Slab One | 4px | Yes | Second Street Barbers |
| `ink` | Ink | #0b0b0b | #c32118 | Pirata One | 2px | Yes | Black Lantern Tattoo |
| `rave` | Rave | #14052e | #ff4fd8 | Unbounded | 22px | Yes | Mika Sol |
| `volt` | Volt | #0e0f0c | #ccff33 | Anton | 8px | No | GET STRONG WITH DEE |
| `pixel` | Pixel | #0a0f1e | #3dffb5 | Press Start 2P | 0px | Yes | pixelpip |
| `conf` * | Ticket | #ff5a1f | #160a05 | Space Grotesk | 14px | Yes | Small Web Day 2027 |
| `rivet` | Rivet | #e9ebea | #1d2326 | Barlow Condensed | 3px | Yes | Rivet Electric |
| `trail` | Trail | #e7ddc2 | #c1561a | Bitter | 6px | Yes | North Shore Walkers |
| `smile` | Smile | #f1fbf8 | #0d7f77 | Sora | 18px | Yes | Bright Street Dental |
| `keys` | Keys | #101820 | #d8b26a | EB Garamond | 6px | Yes | Piano with Elias |
| `crumb` | Crumb | #fbf4e7 | #8a4a1c | Gelasio | 12px | Yes | Crumb School |
| `biscuit` | Biscuit | #ffe08a | #4b2a10 | Fredoka | 26px | Yes | Good Dog Grooming |
| `glass` | Rose window | #10204f | #e8bb4a | Alegreya | 8px | Yes | St Aidan's Parish |
| `rovers` | Rovers | #f2f6fa | #7a1433 | Graduate | 6px | Yes | Riverside Rovers FC |
| `stacks` | Stacks | #dfe8dc | #5b2a86 | Courier Prime | 3px | Yes | Eastvale Public Library |
| `scrap` | Scrapbook | #fbf8f1 | #2d2a32 | Caveat | 6px | Yes | Hi, I'm Lucía |
