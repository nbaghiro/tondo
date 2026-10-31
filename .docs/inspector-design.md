# Inspector design

[builder-port.md](builder-port.md) has the final, shorter list of blocks and fields, and wins wherever the two differ.

This is the design for the editor's inspector panels and every block's layouts. The working demo is `.scratchpad/inspector/index.html`, at http://localhost:8107/.scratchpad/inspector/index.html when `pnpm scratchpad` is running. Nothing here is in `apps/editor` yet. The plan is to settle it in the demo, then move it over in one batch.

The demo has four tabs:

- **Builder:** a working editor with a shelf, a phone canvas in an iframe and the inspector. Every block can be added and edited.
- **All blocks:** all 32 blocks, 3 containers and the header, with their 99 layouts, each in three looks. There are five sets of looks to switch between, and all 24 looks are in the Builder.
- **Field types:** each field type on its own, with its empty, filled, limited and unavailable states.
- **How it behaves:** the rules below, next to the real phone sheet.

## How the inspector works

Every block's panel has the same order:

1. **Where it comes from**, only for blocks that have sources, because the source decides what's asked next. Connected sources replace the typed list.
2. **Layout**, as thumbnails of the person's own block in their own look, so they can see what they're choosing.
3. **Content**, with the most used fields first.
4. **More options**, closed by default.
5. **Visibility and tracking**, closed unless something in it is on, in which case the heading says what. This holds hide, show between dates, highlight and the statistics name.
6. **Move, copy and delete**, at the bottom of the panel on a computer. On a phone they sit on the block, so the sheet stays short.

People choose between designed options and never adjust pixels. Colour fields only offer the page's palette. Limits show only when someone is near them.

### Editing

One click or tap selects a block and opens its panel. Clicking a selected block's text edits it in place, and the panel's field follows as you type. The reverse also works. Fields that aren't visible on the page, such as links and dates, are only in the panel.

### Adding

A new block goes below the selected one, filled with example content, and is selected straight away. On a computer the first field gets focus. On a phone it doesn't, so the keyboard doesn't cover the layout choices. Pasting a link in the shelf picks the matching block.

### On a phone

The panel becomes a sheet that opens halfway, with the page scrolled so the block stays visible above it. Dragging or tapping the grip changes its height, and dragging down from halfway closes it. A bottom bar has Add, Look and Preview.

### States

| State | In the editor | For visitors |
|---|---|---|
| Empty block | A dashed placeholder | Not shown |
| Account not connected | A placeholder, with Connect in the panel | Not shown |
| Connection broken | A warning with Reconnect | The last saved items |
| Hidden, scheduled or ended | Dimmed, with a label | Not shown |
| Needs payments or a later feature | Dimmed, with a label and an explanation | Not shown |
| Plan locked option | Disabled, with a tag naming the plan | Doesn't apply |

## Field types

There are 18 designs: text, long text, formatted text, link, action, photo with crop point, photo list, layout picker, on or off, choice, date and time, price with currency, list of items, source picker, connection picker, icon picker, palette colour and file. `block-system.md` lists 16. Action and file were added here: action because what a tap does changes the fields below it, and file because the `file` block needs an upload state.

## Decisions to review

These are the ones I'd most like checked, because they shape the whole panel:

1. **Source comes before layout.** It's a less common choice than layout, but it decides what the rest of the panel asks for.
2. **Thumbnails use the person's own content,** which costs more to draw than fixed pictures but shows the real result.
3. **Lists open one item at a time,** which keeps a long list short at the cost of one more tap.
4. **Tip stays editable before payments exist,** and is hidden from visitors. The other option is to leave it out of the shelf until then.
5. **Highlight is limited to two per page,** with Outline, Pulse and Nudge. The limit comes from `block-system.md`, and the three styles are my proposal.
6. **Time slots show as Later.** The sample pages use this layout, and it depends on Tondo booking, which is a large piece of work planned for later.
7. **No automatic first-field focus on phones,** so a new block shows its layouts before the keyboard appears.
8. **All seven header layouts work in every look.** To allow that, the demo overrides the header rules the marketing looks set for themselves, so some looks lose detail, such as Sumi's offset ring. Each look should still pick its default.

## What the demo doesn't do

- It doesn't save, sign in, publish or call any provider. Connecting an account only changes a state, with sample items, and file uploads are simulated.
- Countdown days are live, but booking, feeds, tips and maps are drawn to show the design. Embeds are placeholders.
- Blocks move with buttons here, not by dragging on the canvas, because dragging is already built and tested in `apps/editor`. Dragging does work inside lists and photo lists.
- Date scheduling and the highlight limit work in the demo. Text limits are enforced per field, but automatic contrast correction isn't built: Signal and Tide have hand-written fixes in `blocks.css`, found by an audit that only compares the look's colour pairs.
- Tested in Chrome with Playwright at desktop and with phone emulation. It hasn't been tried on a real phone or in Safari, or with screen readers.
- Two panes on a computer is a setting only, because the demo shows the phone layout.

## Moving it to the real app

| Demo file | Goes to | Work involved |
|---|---|---|
| `catalog.js`, each `def()` | `packages/page/src/blocks/*.ts`, one file per block | Add zod schemas, split rendering from content and field lists. Add 29 blocks, and new layouts for the 3 existing ones |
| `catalog.js`, `HEADER` | `packages/render/src/header.ts` | Add the seven layouts to the header schema |
| `catalog.js`, `LOOKS` | `packages/render/src/looks/` | Add the other 22 looks |
| `page.css`, `blocks.css` | Each block's and look's `css` | Split by block, so a page only sends what it uses. Remove the high-specificity header overrides by moving header rules out of the looks |
| `fields.js` | `apps/editor/src/components/Inspector.tsx` and field components | Rewrite as Solid, keeping one component per field type in a single fields file |
| `app.js`, panel code | `Inspector.tsx`, `Shelf.tsx`, `Looks.tsx` | Rewrite as Solid. Canvas logic mostly exists in `Canvas.tsx`, with containers and the shared controls to add |
| Shared controls | `defineBlock` | Added in one place, so every block gets them, as `block-system.md` planned |
| `frame.css` | `apps/editor/src/styles/canvas.css` | Merge with what's there |

Containers need the most care, since the current document model in `apps/editor/src/state/document.ts` is a flat list. Blocks would gain `slots`, and selection, moving and undo would have to work on nested blocks. The demo's `source`, `variant`, `data` and `shared` shape is what I'd use for the saved page, so later phases add sources without changing saved pages. I'd write Playwright tests for this first, from the checks used on the demo.

The field reference below is generated from `catalog.js`.

## Header

### Header (`header`)

- **Layouts:** Centred photo, Left photo, Full photo, Arch, Painted ring, Seal, Banner
- **Fields, in order:** Name; Short line; Photo; Seal letters; About; Social links (More options): Service, Address; Main button (More options); Where it goes (More options)
- **Decision:** Required, so it has no move or delete. Seal letters replace the photo for the seal layout. Each look should pick a default layout.

## Words

### Heading (`heading`)

- **Layouts:** Plain, Ruled, Large
- **Fields, in order:** Heading
- **Decision:** Mostly edited in place on the page, so the panel stays minimal.

### Text (`text`)

- **Layouts:** Plain, Card
- **Fields, in order:** Text
- **Decision:** Bold, italic and links only. Pasted text comes in plain.

### Quote (`quote`)

- **Layouts:** Large, Card
- **Fields, in order:** Quote; Who said it
- **Decision:** A single excerpt. Several quotes belong in `reviews`.

### Ribbon (`ribbon`)

- **Layouts:** Moving, Still
- **Fields, in order:** Message; Colour (More options)
- **Decision:** Reduced motion always gets the still version.

### Divider (`divider`)

- **Layouts:** Space, Line, Paint
- **Fields, in order:** Size
- **Decision:** No content, only a size.

## Links and actions

### Button (`button`)

- **Layouts:** Filled, Outline, Soft
- **Fields, in order:** Where it goes; Button text; Icon (More options)
- **Decision:** The action decides the next field, so a call button asks for a number and a file button asks for an upload. Link goes first because pasting it fills the text.

### Link card (`link-card`)

- **Layouts:** Small photo, Large photo, Icon
- **Fields, in order:** Link; Title; Short description; Photo; Icon
- **Decision:** Link goes first because it fills the title and icon. Pasting a link from a service with its own block offers to switch.

### Feature (`feature`)

- **Layouts:** Photo on top, Text over photo, Side by side
- **Fields, in order:** Photo; Title; Description; Button text; Where it goes; Small label (More options)
- **Decision:** Photo first, since it carries the block.

### Social links (`social`)

- **Layouts:** Icons, Labelled buttons
- **Fields, in order:** Accounts: Service, Address
- **Decision:** The header has its own row too.

### Contact (`contact`)

- **Layouts:** Buttons, List
- **Fields, in order:** Ways to reach you: Type, Number or address
- **Decision:** Each item's type sets its icon and label, so people only type the number or address.

## Photos, video and music

### Photo (`image`)

- **Layouts:** Full width, Framed, Round, Arch
- **Fields, in order:** Photo; Caption; Describe it for screen readers (More options); Link when tapped (More options)
- **Decision:** The screen reader description stays in More options, and it should nudge at publish rather than block.

### Gallery (`gallery`)

- **Layouts:** Grid, Two up, Mosaic, Carousel, Stack
- **Sources:** My photos, Instagram, TikTok covers
- **Fields, in order:** Photos; How many to show
- **Decision:** An Instagram feed is this block with a different source, so it gets every layout. With a connected source, the photo list is replaced by how many to show.

### Video (`video`)

- **Layouts:** Card, Inline, Vertical, Row of latest
- **Sources:** A video link, My YouTube, My TikTok
- **Fields, in order:** Videos: Video link, Title, Length or views, Cover
- **Decision:** Tap to play. Connected sources replace the list.

### Music (`music`)

- **Layouts:** Compact, Full player, Album
- **Sources:** Paste a link, Spotify, Apple Music, SoundCloud
- **Fields, in order:** Album, song or playlist link; Title; Short line; Cover; Songs (More options): Song, Length
- **Decision:** The drawn player here is the design goal only. The real one may have to be the provider's embed, whose terms and looks haven't been checked.

### Posts (`posts`)

- **Layouts:** List, Cards
- **Sources:** Typed in, Blog or podcast feed
- **Fields, in order:** Posts: Title, Date, Short description, Photo, Link; How many to show
- **Decision:** The feed replaces the typed list.

### File (`file`)

- **Layouts:** Card, Button
- **Fields, in order:** File; Title; Short line; Button text (More options); Who can get it (More options)
- **Decision:** Gating sits in More options with its plan state visible.

## Selling and booking

### Products (`products`)

- **Layouts:** Grid, Carousel, List, Single large
- **Sources:** Typed in, Shopify (later), Etsy (later)
- **Fields, in order:** Products: Photo, Name, Price, Where to buy it, Short description
- **Decision:** Links out for now. Shopify and Etsy show as later sources so the place for them is held.

### Services (`services`)

- **Layouts:** Menu, Cards, Price tiers
- **Fields, in order:** Services: Name, Length or description, Price, Book or enquire link, What's included, one per line, Mark as most popular; Button text (More options)
- **Decision:** Also the restaurant menu. Included items and most popular only appear for price tiers.

### Booking (`booking`)

- **Layouts:** Button, Inline calendar, Time slots
- **Sources:** A booking link, Calendly, Cal.com, Tondo booking (later)
- **Fields, in order:** Your booking page; Title; Short line; Button text
- **Decision:** Inline calendar needs Calendly or Cal.com, and picking it switches the source. That calendar is drawn by us here, but the real one is their embed. Time slots need Tondo booking, so they show as Later.

### Events (`events`)

- **Layouts:** List, Cards, Next one only
- **Sources:** Typed in, Bandsintown (later)
- **Fields, in order:** Events: Name, Date and time, Place, Ticket link, Photo; Button text (More options)
- **Decision:** Past events drop off by themselves. Next one only uses the first event.

### Countdown (`countdown`)

- **Layouts:** Large, Inline
- **Fields, in order:** Counting down to; Label; When it's finished (More options); Message (More options)
- **Decision:** The number comes from the date. The finished behaviour is in More options.

### Tip (`tip`)

- **Layouts:** Amounts, Single button
- **Fields, in order:** Title; Short line; Amounts: Amount; Button text
- **Decision:** Editable, but dimmed on the canvas and hidden from visitors until payments exist.

## Collecting from visitors

### Email sign-up (`signup`)

- **Layouts:** Inline, Card
- **Fields, in order:** Title; What people get; Button text; Hint in the box (More options); Send sign-ups to (More options)
- **Decision:** Email only. Mailchimp and Kit show as later.

### Form (`form`)

- **Layouts:** Card, Stacked
- **Fields, in order:** Title; Short line; Questions: Question, Answer type, Options, one per line; Button text; Email answers to (More options)
- **Decision:** Options only appear for a choice question.

## Proof and details

### Reviews (`reviews`)

- **Layouts:** Carousel, Stack, Single
- **Fields, in order:** Reviews: What they said, Who said it
- **Decision:** The panel says reviews must be real, and there's no star rating to fill in.

### Logos (`logos`)

- **Layouts:** Row, Grid
- **Fields, in order:** Label; Names: Name, Logo image
- **Decision:** A name works until there's a logo image.

### Numbers (`stats`)

- **Layouts:** Row, Cards
- **Fields, in order:** Numbers: Number, What it counts
- **Decision:** Limited to four so the row fits on a phone.

### Team (`team`)

- **Layouts:** Circles, Cards, List
- **Fields, in order:** People: Photo, Name, Role, Link to their page
- **Decision:** Links to members' pages on team plans.

### Questions (`faq`)

- **Layouts:** Accordion
- **Fields, in order:** Questions: Question, Answer; Open the first one (More options)
- **Decision:** Works without JavaScript through `<details>`.

### Timeline (`timeline`)

- **Layouts:** Resume, Milestones
- **Fields, in order:** Entries: Title, Date, Details
- **Decision:** Resume runs down the page, and milestones scroll across.

### Location (`location`)

- **Layouts:** Hours, Map, Both
- **Fields, in order:** Address; Short note; Opening hours: Days, Hours
- **Decision:** Tondo builds the directions link from the address. The map in this demo is a drawing.

## Anything else

### Embed (`embed`)

- **Layouts:** Tap to load, Inline
- **Fields, in order:** Link to embed; Service; Title; Preview image
- **Decision:** Approved services only, never pasted scripts. The inline frame is a placeholder here.

## Containers

### Section (`section`)

- **Layouts:** Plain, Tinted, Card, Photo background
- **Fields, in order:** Title; Tint; Background photo; Let people collapse it (More options)
- **Decision:** The panel lists what's inside, with Add a block here.

### Columns (`columns`)

- **Layouts:** Two equal, Wide and narrow
- **Fields, in order:** Stack on phones
- **Decision:** Turns on stacking when a block needs the full width.

### Tabs (`tabs`)

- **Layouts:** Pills, Underlined
- **Fields, in order:** Tabs
- **Decision:** Between two and four tabs. Clicking a tab on the canvas shows that tab's blocks.
