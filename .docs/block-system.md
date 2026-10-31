# Block system

This is the proposed full set of building blocks for a Tondo page. None of it is built yet. The working version of a smaller set is in `.scratchpad/editor/`.

## How it fits together

| Layer | What it is | Who sees it |
|---|---|---|
| Look | Colours, type, shapes, card style, art and motion, applied to the whole page | People choose one |
| Elements | Shared parts such as image, button, price, date tile and chip. Blocks are built from these, so they all follow the look | Nobody directly |
| Blocks | Things people add: 32 in the catalogue below | People add, edit and move them |
| Containers | Section, columns and tabs, which hold other blocks | People add them |
| Starters | A look and a set of blocks for a kind of person, such as a musician or a salon | People pick one at the start |

Every block is described by the same four questions:

1. **Content:** what it says.
2. **Source:** where the content comes from. It's typed in by hand, read from a connected account, or kept by Tondo.
3. **Variant:** which designed layout it uses.
4. **Action:** what happens when someone taps it. It opens a link, opens an embed, or runs a Tondo feature.

Keeping these separate is what lets the list stay short. An Instagram feed isn't its own block. It's a gallery with Instagram as its source, so it gets every gallery layout automatically. The old gallery and carousel become one block with two variants for the same reason.

## Blocks

### Words

| Block | Variants | Notes |
|---|---|---|
| `heading` | plain, ruled, large | Groups what's below it |
| `text` | plain, card | Bold, italic and links only |
| `quote` | large, card | A single excerpt |
| `ribbon` | moving, still | Reduced motion always gets still |
| `divider` | space, line, paint | The paint variant uses the page's art |

### Links and actions

| Block | Variants | Notes |
|---|---|---|
| `button` | filled, outline, soft | Optional icon and highlight |
| `link-card` | small photo, large photo, icon | Was `thumb`. Filled in from a pasted link |
| `feature` | photo on top, text over photo, side by side | The one thing someone most wants seen |
| `social` | icons, labelled buttons | The header has its own row too |
| `contact` | buttons, list | Call, email, directions, save contact, and WhatsApp, Telegram, Messenger and Viber |

### Photos, video and music

| Block | Variants | Sources |
|---|---|---|
| `image` | full, framed, round, arch | Upload, library |
| `gallery` | grid, two-up, mosaic, carousel, stack | Upload, Instagram, TikTok covers |
| `video` | card, inline, vertical, row of latest | YouTube, Vimeo, TikTok, Instagram link |
| `music` | compact, full player, album | Spotify, Apple Music, SoundCloud |
| `posts` | list, cards | RSS, which covers most blogs, newsletters and podcasts |
| `file` | card, button | Upload. Later delivered after a sign-up or purchase |

### Selling and booking

| Block | Variants | Notes |
|---|---|---|
| `products` | grid, carousel, list, single large | Links out first, Tondo checkout later. Shopify and Etsy sources later |
| `services` | menu, cards, price tiers | Name, duration, price, and a book or enquire action. Also a restaurant menu |
| `booking` | button, inline calendar, time slots | See "Booking" below |
| `events` | list, cards, next one only | Date, place, ticket link. Bandsintown source later |
| `countdown` | large, inline | Hides itself or shows a message when finished |
| `tip` | amounts, single button | Needs payments |

### Collecting from visitors

| Block | Variants | Notes |
|---|---|---|
| `signup` | inline, card | Email only, the common case |
| `form` | card, stacked | Enquiries with chosen fields |

### Proof and details

| Block | Variants | Notes |
|---|---|---|
| `reviews` | carousel, stack, single | Typed in. Must be real, and the editor says so |
| `logos` | row, grid | Press and clients |
| `stats` | row, cards | Typed in by the person |
| `team` | circles, cards, list | Links to members' pages on team plans |
| `faq` | accordion | Works without JavaScript through `<details>` |
| `timeline` | resume, milestones | Work history or a story, in date order |
| `location` | hours, map, both | Replaces `hours`. Includes a directions link |

### Anything else

| Block | Variants | Notes |
|---|---|---|
| `embed` | inline, tap to load | Approved providers only, never pasted scripts |

### Containers

| Container | Options | Notes |
|---|---|---|
| `section` | plain, tinted, card, photo background | Title, and can collapse |
| `columns` | two equal, wide and narrow | Stacks on phones if the content needs it |
| `tabs` | pills, underlined | Such as Shop, Book, About |

Containers can't hold other containers. This keeps every page editable on a phone.

### Header

The header is required and belongs to the page, so it isn't in the block list. Each look picks a default, and a person can change it.

Variants: centred avatar, left avatar, full photo, arch, painted ring, seal, banner. It holds a photo or logo, name, short line, about text, social icons and an optional main button.

### Renames from the current experiment

| Now | Becomes |
|---|---|
| `thumb` | `link-card` |
| `player` | `music` |
| `hours` | `location` |
| `carousel` | a `gallery` variant |
| `form` | `signup` and `form` |

## Page layout

Pages are designed for a phone first.

- **Phone:** one column with edge-to-edge options for ribbons, carousels and photos.
- **Desktop:** a choice of centred column, or two panes where the header stays fixed on the left and blocks scroll on the right.
- **Background:** paint, solid, pattern or photo, set by the look and changeable by the person.

## Control system

The rule is that people choose between designed options, and never adjust pixels. Nothing they can pick should look broken.

### Levels

| Level | Controls |
|---|---|
| Page | Look, paint and repaint, font pairing, button shape, background, desktop layout, address, title and share image |
| Block | Content, source, variant, action, plus the shared controls below |
| Item in a list | Its own fields, reorder, remove |

### Shared on every block

- Hide or show
- Show between dates, for sales and events
- Highlight, which uses the look's emphasis style, with a small set of attention animations, and is limited to one or two per page
- Name for click statistics
- Move, duplicate, delete

### Field types

Each block lists its fields, and `Inspector.tsx` draws them. There are about 16 types: text, long text, formatted text, link, photo with crop point, photo list, variant picker with thumbnails, on or off, choice, date and time, price with currency, list of items, source picker, connection picker, icon picker and colour from the page's palette.

### Guardrails

- Text limits are set per field, so nothing overflows a designed layout.
- Button and text colours are checked for contrast against the look, and corrected automatically.
- Photos are always cropped to their frame around a chosen point.
- Empty fields disappear from the page instead of leaving gaps.
- Links are checked for safe addresses.

## Real functionality

### Connected accounts

| Provider | How it works | Limits |
|---|---|---|
| Instagram | Sign in with Instagram, then read that account's media | Needs a professional (business or creator) account. Serving other people's accounts needs Meta's Advanced Access, which requires App Review and Business Verification |
| TikTok | Sign in with TikTok. `video.list` and `user.info.basic` scopes | Only the signed-in account. Each scope is reviewed, with a demo video. TikTok says several days to two weeks |
| YouTube | Read a channel's uploads playlist | Costs 1 quota unit per page, with 10,000 units a day by default. Avoid `search.list`, which has a limit of 100 a day. Reading public videos with an API key still needs confirming |
| Spotify, Apple Music, SoundCloud | Their embed players | Not yet checked against their terms |
| RSS | Read the feed | No account needed |

People with a personal Instagram account can't connect through this API, so the editor needs a plain fallback: upload photos, or use a link card to their profile.

**How feeds run.** Visitors' browsers never call these services. A server job fetches new items on a schedule and saves a copy, and the page shows that copy. So a slow or broken provider can't slow the page. If a connection stops working, the page keeps its last items and the person is told.

**To check before building:** how long each provider's media may be stored or cached, whether images must be served from their own addresses, and what data deletion each one requires. These terms decide whether we can copy images to our storage.

New pieces: encrypted token storage, a `connections` table, a `feed_items` table and a scheduled job.

### Booking

| Level | How it works | Cost and limits |
|---|---|---|
| 1. Link | A button to their existing booking page | Trivial |
| 2. Embed | Calendly or Cal.com, inline or in a pop-up | Small. Calendly's API can list event types and links but doesn't support booking, so the booking flow has to be their embed |
| 3. Tondo booking | Our own time slots, in the look: availability rules, calendar sync, time zones, confirmation emails, rescheduling | Large. It's a product of its own |

The time slots on Priya's sample page are level 3. Levels 1 and 2 can't show slots in Tondo's own design, at least with Calendly, so that sample has to change until level 3 exists.

### Payments

Tips and checkout would use Stripe Connect, which supports a platform fee on each sale. Until then, `products` links out and `tip` stays hidden. This needs tax, refund and payout decisions before it starts, and Stripe's current fees need checking.

### Forms and sign-ups

Tondo stores submissions, emails the person, offers a CSV export and applies spam limits. Sending sign-ups on to Mailchimp or Kit comes later.

### Statistics

Daily counts per block through the existing redirect plan, with no visitor profiles.

## What this changes for public pages

Today's rule is that public pages send no JavaScript, and the server's security policy blocks scripts entirely. Embeds, forms and countdowns can't all work under that.

The new rule is **no JavaScript unless a block on that page needs it**:

- Each block declares what it needs: a small script, or embed providers it may load.
- Carousels use CSS scroll snapping, and accordions use `<details>`, so both need no script.
- Embeds show a preview image and load the real player only when tapped.
- The server builds each page's security policy from its blocks, so a page with no embeds still allows none.

## Block definition

```ts
export const gallery = defineBlock({
    type: "gallery",
    name: "Gallery",
    group: "media",
    schema: z.strictObject({ items: z.array(mediaItem), source: mediaSource }),
    make: () => ({ source: { kind: "manual" }, items: [...] }),
    variants: { grid: "Grid", mosaic: "Mosaic", carousel: "Carousel" },
    sources: ["manual", "instagram", "tiktok"],
    fields: [source(), list("items", [photo("photo"), text("caption", "Caption")])],
    needs: {},
    render: (block, variant) => `...`,
    css: `...`,
});
```

Every block also gets the shared controls from one place, so `defineBlock` adds them.

## Order of work

[features.md](features.md) holds the full order. For blocks:

| Phase | What ships | Depends on |
|---|---|---|
| 1. Core | Words, links and actions, `image`, `gallery` by upload, `video`, `music`, `products` and `services` linking out, `events`, `countdown`, `reviews`, `logos`, `stats`, `team`, `faq`, `timeline`, `location`, containers, header variants, shared controls | Nothing external |
| 2. Collecting and booking | `signup`, `form`, `file`, `booking` levels 1 and 2, `posts`, `embed`, statistics | Server, email |
| 3. Connected accounts | YouTube first, then Instagram and TikTok, then other feeds | Meta and TikTok review. Apply during phase 1, because review takes time |
| 6. Payments | `tip`, Tondo checkout | Stripe Connect, tax decisions |
| 8. Tondo booking | Booking level 3 | Calendar sync, email |

The schema for every block is designed up front, so later phases add sources and actions without changing saved pages.

## Decisions

Proposed, and open to change:

- 32 blocks and 3 containers, with variants in place of extra blocks.
- Designed options only, with no free styling.
- Feeds are saved server-side, and visitors never call providers.
- Scripts only when a block needs them.
- Native booking and payments come after connected accounts.

Still open:

- Which legal entity applies for Meta Business Verification and TikTok app review.
- Whether Tondo booking should reuse anything from Clientbridge. That hasn't been looked into.
- Provider terms on storing media, listed above.

## Sources

Checked on 2026-10-31. Most competitor information came from comparison blogs, which disagree in places, so it only informed the list.

- [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started)
- [Instagram Platform overview](https://developers.facebook.com/docs/instagram-platform/overview)
- [TikTok Display API](https://developers.tiktok.com/doc/display-api-get-started/)
- [YouTube Data API quota costs](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Calendly embed and the API](https://calendly.com/help/calendly-embed-and-the-api)
- [Cal.com embed](https://cal.com/embed)
- [Stripe Connect application fees](https://edge-docs.stripe.com/connect/marketplace/tasks/app-fees)
- [Beacons and Linktree comparison](https://www.unilink.us/blog/linktree-vs-beacons)
