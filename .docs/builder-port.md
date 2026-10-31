# Builder port

This is the final plan for moving the full builder into `apps/editor`, written on 2026-10-31. It replaces the block list in [block-system.md](block-system.md) and the field reference in [inspector-design.md](inspector-design.md) wherever they differ. Nothing here is built yet, and the demo at `.scratchpad/inspector` still shows the longer set.

The goal is that someone can build any page in the gallery in the real editor, and publish it.

## What the review found

I checked all 32 blocks, 3 containers and 99 layouts against what the 50 example pages actually use.

- **Overlap.** Quote and reviews, social and contact, and feature and link card each do nearly the same job.
- **Unused layouts.** Many layouts appear on no example page, and several differ little on a phone, such as a video card and an inline video.
- **Controls that work against the design.** A ribbon colour, button icons and a currency picker all add choices without making pages better.
- **Pickers a pasted link can answer.** A Spotify link already says it's Spotify, and an email address or phone number already says what the button does.
- **Promises not yet kept.** "Later" tags on sources and layouts add clutter for things nobody can use.
- **A real gap.** The example pages' signature headers don't fit seven fixed layouts, and the goal progress on Clean River has no block at all.

## The result

| | Before | After |
|---|---:|---:|
| Blocks | 32 | 29 |
| Layouts, including tabs and held ones | 99 | 66 |
| Containers | 3 | 1 |
| Field types | 18 | 12 |
| Controls on every block | 4 | 3 |

## Rules for the inspector

1. **One order for every block:** source (only on 3 blocks), layout, content, then "Show or hide" closed at the bottom.
2. **A block with one layout shows no layout picker.** Eight have one, counting tabs.
3. **More options exists only where a field earns it.** Only 7 blocks use it after this cleanup.
4. **A link field understands what you paste.** A web address links, an email address sends mail, a phone number calls, and a known service fills in the title and icon. There's no action picker.
5. **Colours and sizes come from the look.** No block has a colour field.
6. **Nothing unavailable appears.** Blocks and layouts that need something unbuilt stay out of the shelf and pickers until they work. Their code and schemas are in place, so saved pages won't need to change.
7. **Move, copy and delete live on the block's toolbar,** and aren't repeated in the panel. "Show or hide" holds hide, show between dates and highlight.

### The 12 field types

Text, long text, link, photo with crop point, photo list, layout picker with thumbnails, on or off, choice, date and time, list of items, source and file.

Removed: formatted text (a long text field makes links clickable by itself, which also removes HTML from saved pages), action (now part of link), icon picker (icons come from the link), palette colour, price with currency (a plain text field allows "From $48 CAD") and connection picker (now part of source).

## Blocks

"Hold" means it's built but kept out of the shelf until the thing it needs exists. A field marked "more" is behind More options.

### Words

| Block | Layouts | Fields, in order | Cut, and why |
|---|---|---|---|
| `heading` | Plain, Large | Heading | Ruled layout: a look's job, as Bloom does |
| `text` | Plain, Card | Text | Bold and italic, see above |
| `ribbon` | Moving, Still | Message | Colour field |
| `divider` | Space, Line, Paint | None | Size field: one good size per layout |

### Links and actions

| Block | Layouts | Fields, in order | Cut, and why |
|---|---|---|---|
| `button` | Filled, Outline | Link, Button text | Soft layout and icon: unused. File action: use `file` |
| `link-card` | Small photo, Icon, Large photo, Text over photo, Side by side | Link, Title, Description, Photo, Button text (large layouts), Small label (more) | Absorbs `feature`. Icon picker |
| `contact` | Icons, Buttons, List | Items: Type, Number or address | Absorbs `social`, so one list holds Instagram and WhatsApp alike |

### Photos, video and music

| Block | Layouts | Fields, in order | Cut, and why |
|---|---|---|---|
| `image` | Full width, Framed, Round, Arch | Photo, Caption, Description for screen readers (more), Link (more) | Nothing |
| `gallery` | Grid, Mosaic, Carousel | Source, Photos with captions, or How many | Two up and Stack: unused |
| `video` | Card, Vertical, Row | Source, Videos: Link, Title, Length, Cover | Inline: the same as Card on a phone |
| `music` | Compact, Full | Link, Title, Short line, Cover, Songs (more) | Album layout. Source picker: the link says which service |
| `posts` | List, Cards | Source, Posts: Title, Date, Description, Link, or How many | Photo on each post |
| `file` | One | File, Title, Short line | Button layout. Who can get it, until gating exists |

### Selling and booking

| Block | Layouts | Fields, in order | Cut, and why |
|---|---|---|---|
| `products` | Grid, Carousel | Items: Photo, Name, Price, Link | List and Single: use `link-card`. Later sources |
| `services` | List, Menu, Price tiers | Items: Name, Detail, Price, Link, What's included (tiers), Most popular (tiers). Button text (more) | Cards: unused |
| `booking` | Card, Inline calendar (hold), Time slots (hold) | Link, Title, Short line, Button text | Source picker: the link says which service. Time slots wait for Tondo booking |
| `events` | List, Next one only, Schedule | Items: Name, Date and time, Place, Link. Button text (more) | Cards and event photos: unused. Schedule replaces the example pages' one-off version |
| `countdown` | Large, Inline | Date, Label, Message once it's over (more) | The "when finished" choice: an empty message hides the block |
| `tip` (hold) | Amounts, Single button | Title, Short line, Amounts, Button text, Raised and Goal (more) | Waits for payments. Raised and Goal draw the progress bar |

### Collecting from visitors

| Block | Layouts | Fields, in order | Cut, and why |
|---|---|---|---|
| `signup` (hold) | Card, Plain | Title, Short line, Button text | Hint text and "send to": defaults are fine |
| `form` (hold) | One | Title, Short line, Questions: Question, Type, Options. Button text | Stacked layout. "Email answers to" uses the account's email |

### Proof and details

| Block | Layouts | Fields, in order | Cut, and why |
|---|---|---|---|
| `quotes` | Large, Card, Carousel | Items: What they said, Who said it | Replaces `quote` and `reviews`. Stack layout |
| `logos` | One | Label, Items: Name, Logo image | Grid: the row wraps by itself |
| `stats` | One | Items, up to 4: Number, What it counts | Cards layout |
| `team` | Circles, List | Items: Photo, Name, Role, Link | Cards layout |
| `faq` | One | Items: Question, Answer | "Open the first one": it always does |
| `timeline` | One | Items: Title, Date, Details | Milestones layout |
| `location` | Hours, Map, Both | Address, Short note, Opening hours | Nothing |

### Anything else

| Block | Layouts | Fields, in order | Cut, and why |
|---|---|---|---|
| `embed` (hold) | One | Link, Title, Preview image | Inline: tap to load is safer and faster. Service is read from the link |
| `tabs` | One | Tabs, 2 to 4: Label, blocks inside | Underlined layout |

### Containers cut

`section` and `columns` are cut. No example page uses either, a heading groups blocks well on a phone, and columns fight a phone-first page. Tabs still need blocks nested inside a block, so adding them later doesn't change the model.

### Controls on every block

Hide, show between dates and highlight. Highlight is on or off, using the look's own emphasis, with at most two per page. The statistics name is cut, because a block's title does the job.

## Header and looks

**A look can bring its own header.** The header's layout choices are "This look's own", Centred, Left, Full photo, Arch and Banner, with the look's own as the default. Painted ring and seal become signature headers for the looks that use them. A person still edits only Name, Short line, Photo, About, Links and Main button (more), so every signature header draws from those fields and never asks for its own.

```ts
export const surf = defineLook({
    label: "Surf",
    fonts: "...",
    palette: [...],
    seed: 31,
    css: `...`,
    header: (page, ctx) => `...`,
});
```

**All 50 looks are ported,** one file each. A page sends only its own look's CSS and fonts, and only the CSS for blocks it uses.

Some signature headers hold details that aren't in the fields, such as the prices on Tally's ledger or the fixture on Riverside Rovers. Those details become part of a normal block below the header, so a few pages will change slightly.

## Data model

[data-model.md](data-model.md) has the storage design: `users` and `pages`, with each page's blocks in one JSONB document.

- Blocks keep the flat shape `defineBlock` has now, with `source` added where it applies. I'm not adopting the demo's nested `data` and `shared`, because flat is what's tested and it reads better in zod.
- `tabs` holds `{ id, label, blocks }[]`. Tabs can't contain tabs, and the schema enforces that.
- Every document has a `version`, photos are `{ file, x, y, zoom }`, and list items have stable ids.
- Selecting, moving, copying, deleting and undo work by block id across the whole tree.

## How the 50 example pages map to blocks

I checked each helper the example pages use. Everything has a home, with these consequences:

| Example pages use | Becomes |
|---|---|
| `thumb`, `feature` | `link-card` layouts |
| `carousel`, `mosaic`, `feed` | `gallery` layouts. Kai's feed is a gallery with a held Instagram source |
| `player` | `music` |
| `video`, `verticals` | `video` layouts |
| `menu`, `tiers`, `services` | `services` layouts |
| `schedule` | `events` Schedule |
| `countline` | `countdown` Inline |
| `quote`, `reviews` | `quotes` |
| `hours`, `map` | `location` |
| `people` | `team` List |
| `form` | `signup`, held, on 9 pages |
| `enquiry` | `form`, held, on 5 pages |
| `tip`, `progress` | `tip`, held, on 4 pages |
| `booking` | `booking` Time slots, held, on 2 pages. This adds a held layout to the list above, for 66 in all |

Three things need more than a mapping:

1. **Held blocks render but don't work.** Availability only controls the shelf and pickers. 14 or more example pages include a sign-up or form that does nothing until the follow-up work.
2. **Drawn pictures become image files.** Juno's prints, Oskar's product screens and similar drawings are inline SVG today, and a block only holds a photo. They'll be exported to files in the demo photo set.
3. **Looks reach into blocks.** About 130 look rules restyle block classes, such as `.sumi .b-thumb`. Those class names are therefore part of the look contract, so a block's class names are chosen once, in step 3, and a test checks that every look's selectors still match something.

## Files

Same layout as [repo-structure.md](repo-structure.md), with these additions:

| Where | What |
|---|---|
| `packages/page/src/blocks/*.ts` | One file per block: schema, fields, layouts, availability, `make`, `render`, `css` |
| `packages/page/src/operations.ts` | Add, move, copy, remove and set field, across the tree. Moved from `apps/editor/src/state/document.ts`, so importers and the API use the same code |
| `packages/page/src/upgrade.ts` | Brings an old saved document up to the current `version` |
| `packages/render/src/looks/*.ts` | One file per look, with its signature header |
| `packages/contract/src/index.ts` | Draft, save and publish requests and responses |
| `apps/server/src/pages.ts` | Draft, save, publish and photo routes. Each checks the signed-in user owns the page |
| `apps/server/src/limits.ts` | The one function that checks plan limits, permissive for now |
| `apps/editor/src/components/` | `Inspector`, `Shelf`, `Looks`, `Canvas`, `TopBar`, plus `Fields` (all 12 field types in one file), `Thumbnail` and `PhotoPicker` |
| `tests/` | Playwright tests, run in CI |

## Order of work

Each step ends with `pnpm check` passing and something you can try. Steps marked **Review** stop for your eye before the next one starts.

### 0. Baseline

Commit today's work, because the repo has no commits at all and a port this size needs history. This needs your go, see "Decisions" below.

### 1. Safety net

Done. `pnpm e2e` runs in CI as the `browser` job.

- Add Playwright to the repo and CI, covering what's been checked by hand: selecting, inline editing, dragging, undo, phone sheet.
- Tests can't use real Neon, so they run the server against a local stand-in for Neon's API, which only the test setup can turn on.
- A smaller set covers sign-up, the verify screen and the claim screen.

Finished when the tests pass on today's editor.

### 2. Foundations

Done.

- `defineBlock` gains layouts with availability, sources and field conditions. `defineLook` gains `header`.
- CSS moves per block, so a page only sends what it uses.
- Tabs tree and operations move into `packages/page`.
- The page document gains `version` and the new photo shape.
- The browser draft key changes, so local browser drafts reset. The seed page is rewritten, and your own test account starts from a new empty page.

Finished when today's three blocks and two looks still render through the new shape, with tests extended.

### 3. One slice, all the way through: **Review**

Built on 2026-10-31 and waiting for review. `heading`, `text`, `button`, `link-card` and `gallery`, in Madder, Sumi, Surf and Dusk. All 12 field types exist. `source` and `file` aren't used by these blocks, so they can be tried at `/?fields` on the dev server only.

Before moving everything, build a small set to full quality: `heading`, `text`, `button`, `link-card` and `gallery` (the hardest common one), in Madder, Sumi and Surf (one signature header).

This includes the real inspector: all 12 field types, thumbnails, link paste detection, Show or hide, the phone sheet and the toolbar. It also fixes the empty header in your screenshot, where "Add text" shows twice, so empty fields only show on selection.

This replaces the old order, where blocks came before the inspector, because the panel carries the most design risk and every later block depends on its shape. You review how it feels before 24 more blocks follow it.

### 4. All blocks

The remaining 24, in groups: words and actions, media, selling, details, then held ones. They follow the slice's pattern, so this can run in parallel agents. A shared test covers every block: escaping, unsafe links, empty fields, overflow at phone width, and every layout rendering.

Finished when a test gallery shows all 66 layouts.

### 5. All looks: **Review**

- All 50 looks, with fonts and signature headers. Headers draw only from the header's fields, and fixed details like Tally's prices move into blocks.
- Automatic checks for text contrast in each look and that its selectors match.
- The look gallery shows the person's own page in each look, and adds paint swatches, Paint it again and the reveal when changing look.

You review the gallery with your own content, because this is where the beauty standard gets tested.

### 6. Canvas and shelf

- Tabs on the canvas, and adding, dragging and selecting inside a tab.
- Shelf with miniatures, grouped, and a paste box that picks the matching block.
- Preview mode, keyboard shortcuts and the phone bottom bar.
- Playwright covers nested blocks and the phone layout.

### 7. Saving and publishing: **Review**

- Drafts save to the server about a second after a change, with `updated_at` refusing to overwrite a newer save. The status line says what happened, and a failed save keeps the work in the browser and retries.
- A Publish button runs the strict checks, including that links are filled and safe, and lists what to fix.
- `/handle` serves the published page. Dated blocks and countdowns are worked out when it's rendered, so cached copies stay short-lived.
- `/l/:page/:item` and the `stats` table count clicks.
- Page settings: title and description. Publishing requires an address, which sign-up already ensures.

Finished when a new account can make a page, publish it and open it logged out.

### 8. Photos

- Uploads go straight to object storage (RustFS locally), resized and checked for type and size on the server.
- The picker has uploads and a demo photo library, and a crop point on every photo.
- Production storage is a decision below.

### 9. Examples on the real renderer: **Review**

- All 50 pages become saved page documents, written from the current ones.
- The gallery, hero, preview and auth wall use the real renderer's output, replacing the static copies, the copied CSS and the generator in `.scratchpad`.
- Screenshots are compared with today's for each page, and I list every page that visibly changed for you to judge. Some will, as explained under "How the 50 example pages map to blocks".

### 10. Clean up

- Remove `.scratchpad/editor`, `.scratchpad/inspector`, the copied CSS and the old demo copies in `.docs/marketing`.
- Update the docs and run on a real phone and in Safari, which needs you for the phone.
- Move `/maya` and `/noor` to full names, normalise address case, and add a pause control to the filmstrip, since these came up in the marketing work.

## Decisions before starting

1. **Commit and GitHub.** Nothing is committed. I recommend committing the baseline now and creating a private repo, which also finally runs CI. I won't do either without your go. Photos and screenshots add about 30 MB, which I'd keep out of git long term.
2. **Production photo storage.** Only needed at deploy. Galleo's own hosting notes point to Cloudflare R2 with no egress fees, and I'd do the same. The code only talks S3, so local work doesn't depend on this.

Everything else uses the defaults already agreed in this document and [data-model.md](data-model.md).

## Not in this port

These stay hidden in the shelf, and each needs its own piece of work afterwards:

- **Onboarding:** what a new person sees first, including starter pages and a real name instead of their email's first part. You've said this comes later, and I'd do it next, since a good first page depends on the finished blocks.
- **Sign-ups and forms:** storing submissions and sending email. These need your own email provider.
- **Connected accounts:** Instagram, TikTok and YouTube, plus RSS.
- **Payments:** `tip`, and checkout.
- **Embeds and inline calendars:** these need the per-page security policy from `block-system.md`.
- **Tondo booking:** time slots.
- **Deployment:** Render, production Neon settings, your own Google client and email sender, and real legal pages.

## Known limits

- **The music block is a designed card that opens the link.** It can't play music. A real player would mean the provider's embed, whose terms and looks haven't been checked.
- **Maps are decorative drawings** that open directions. A real map means choosing a provider and paying for it.
- **Thumbnails of a person's own content** cost more to draw than fixed pictures. If they're slow on a phone, they'll fall back to simpler ones.
- **Public page art:** paintings are still drawn with SVG filters on the visitor's phone. Rasterising them at publish, as `how-it-works.md` plans, comes after this port.
- **Trying it for real:** nobody but you has used the editor, and the roadmap asks for a few people to try it unaided. I'd do that after step 7.
