# Data model for blocks and pages

This is how pages and blocks get saved, finalised on 2026-10-31.

## Recommendation

Keep Postgres, and store each page's blocks as one JSONB document on the page. Anything with its own life outside a page gets a normal table.

A page is always read and written whole, and it has about 30 block shapes that change often. That suits a document. Accounts, addresses, clicks and sign-ups need joins, uniqueness and transactions, which suits tables. Postgres does both in one database, so publishing a page and updating its links can happen in one transaction.

## Options compared

| Option | For | Against | Verdict |
|---|---|---|---|
| Postgres with JSONB | Already running. One backup and one transaction across accounts and pages. Zod checks each block's shape | Editing one block rewrites the document, which is fine at this size | Use this |
| A table per block type | The database checks every column | About 30 tables, and a new table for every new block. Reading a page means many queries, and publishing means copying rows | No |
| One `blocks` table with a JSON column | Can query or count single blocks | Ordering, nested tabs and copying for publish become row work, for queries we don't need | No |
| MongoDB | Natural fit for documents | A second database to run, with no shared transactions with accounts, and it gains nothing over JSONB here | No |
| Firestore or DynamoDB | Scale easily | Weak at the joins that analytics, teams and billing need, and they tie us to a provider | No |
| SQLite at the edge | Very fast reads | Public pages will be cached anyway, so the database is rarely read by visitors | No |

Live co-editing on a team would need something like CRDTs, which is a separate decision. It isn't on the plan, and a saved document still works as the stored copy if it's added later.

## Tables

Finalised on 2026-10-31, and applied to local Docker. The rules are as few tables as possible, single-word plural names, nothing stored that code can work out, and no column or table until a feature uses it.

Emails, passwords and sessions live in Neon Auth's own `neon_auth` schema.

**3 tables exist:**

| Table | Columns | What it's for |
|---|---|---|
| `users` | id | One person. `id` is Neon Auth's user id. A row appears when they claim their first address. `suspended_at`, when set, stops all their pages being served. `plan`, `stripe_id` and `ends_at` hold their plan, see [plans-implementation.md](plans-implementation.md) |
| `teams` | id, owner_id, invites_from | A team. Its name and look come from its oldest page of its own. A person's team is the one they own, or the one their joined page is on. See [teams-implementation.md](teams-implementation.md) |
| `pages` | id, user_id, team_id, handle, draft, published, updated_at, created_at | The page being edited and its live copy, each one JSONB document. `handle` is the page's own address, unique across everyone. `created_at` keeps the list in order |

| `stats` | page_id, target, day, count | Daily counts. An empty target is a page view, and any other is one link |

**Tables that arrive with their feature:**

| Table | Columns | Arrives with |
|---|---|---|
| `contacts` | id, user_id, email, entries, unsubscribed_at, created_at | Sign-ups and forms |
| `connections` | id, user_id, provider, credentials, items, fetched_at | Connected accounts |

**On `users` for teams and Pro:** `editor`, and `packs` copied from Stripe's quantity. **Columns that arrive later on `users`:** `domain` with custom domains. `plan` is a copy of what Stripe knows, because asking Stripe on every page load would be too slow.

Tables only needed for much later features are `links` (standalone QR codes and short links, phase 4), `products` and `orders` (selling, phase 6) and `bookings` (Tondo booking, phase 8).

### What's derived, not stored

| Value | Comes from |
|---|---|
| Whether a page is published | `pages.published` being set |
| The save check | `pages.updated_at` |
| A person's name and email | Neon Auth's session |
| Page title and icons | The page document and its links |
| Click totals | Summed from `stats` |
| A link's destination | The live page, through `/l/:handle/:id`. The id is a hash of the address, so `stats` counts per address, not per block |
| Photo list and storage use | Listing storage |

### Trade-offs

- **No version history or rollback.** Publishing overwrites `published`. A `versions` table can be added later without touching anything else.
- **An address belongs to a page.** `pages.handle` is the only list of addresses, so one unique constraint means no address is taken twice. It has no table of its own, because a page and its address have the same life. Old addresses that keep redirecting, or addresses held with no page, would need one.
- **`users.id` has no foreign key** to Neon Auth's tables, which Neon manages. Deleting a person means removing their `users` row in code, which isn't built yet, and their pages follow.
- **`contacts.entries`** holds form answers with the person. Listing one form's answers scans the user's contacts, so split it out if that gets slow.
- **Photos have no table.** Listing storage is slower than a query, which is fine for a picker and upload limits.

## Page document

```json
{
    "version": 2,
    "look": "surf",
    "seed": 31,
    "style": { "colour": { "mode": "brand", "brand": "#0a8f5c" }, "font": "editorial", "shape": "soft" },
    "header": {
        "layout": "look",
        "wordmark": "poster",
        "name": "Low Tide Surf",
        "tagline": "Learn to surf in Tofino",
        "bio": "",
        "photo": { "file": "a1f3.jpg", "x": 50, "y": 30, "zoom": 1 },
        "links": [{ "type": "instagram", "value": "https://instagram.com/lowtide" }]
    },
    "blocks": [
        { "id": "b7k2", "type": "heading", "variant": "plain", "text": "Lessons", "section": "s1" },
        {
            "id": "c9m4",
            "type": "services",
            "variant": "list",
            "section": "s1",
            "tint": true,
            "showUntil": "2026-12-01T08:00:00Z",
            "items": [
                { "id": "i1", "name": "First wave", "detail": "2 hours", "price": "$95", "link": "https://example.com" }
            ]
        },
        {
            "id": "t3p1",
            "type": "tabs",
            "tabs": [{ "id": "t1", "label": "Shop", "blocks": [] }]
        }
    ]
}
```

### Sections, style and wordmarks

- **`section`** is an optional id on a block. Blocks with the same id next to each other are one section in the editor, such as a title and its list, or a run of links. A section's kind is worked out from its blocks, not stored. Blocks are still what's saved and what renders.
- **`tint`** is an optional flag that draws a section on a soft band of the page's colour.
- **`style`** is an optional object on the page: `colour` (`preset`, `brand`, `photo`, `plain` or `dark`, with a hex `brand`), `font`, `shape`, `fill`, `bg` and `bgPhoto`. Leaving a key out means the look's own choice, and the look stays the base. The server-side renderer applies it, along with contrast rules, so published pages still carry no script.
- **`header.wordmark`** optionally draws the name as a logo.
- **Painted placeholders** are photos with a file named `paint-N`. They're drawn from the page's colours rather than stored, and publishing warns about them but allows it.
- **Version 2** added these. `upgrade.ts` gives version 1 pages section ids when they're read.

### Rules for keeping it clean

1. **A version number on every document.** Old pages are upgraded by small functions in `packages/page` when they're read, so the database doesn't need a migration when a block changes.
2. **Stable ids on blocks and list items.** Statistics, form answers and undo all rely on them, so an id never changes when something moves. Duplicating makes new ids.
3. **Save the person's words only.** Rendered HTML, click counts, feed items and detected icons are never saved in the document, since they can all be worked out or fetched.
4. **Leave out empty and default values,** so documents stay small and changing a default doesn't need rewriting them.
5. **Photos are `{ file, x, y, zoom }`.** The file is named after its contents and stored under its workspace, so moving storage only changes a setting.
6. **Draft rules are looser than publish rules.** A draft may have an empty link, and publishing requires one. A broken block in a draft shouldn't stop the page opening, so a block that can't be read is kept and flagged, not dropped.
7. **Limits live in the schema:** 200 blocks, text lengths and list sizes, which also keeps a document to a modest size.
8. **Dates come in two kinds.** Schedules ("show until") are exact instants in UTC. Events are local times, such as "2026-11-14T10:00", with the page's time zone, because a 10 am class stays at 10 am when the clocks change.

Two optional fields sit at the top of the document. `timeZone` is the person's IANA zone, set from their browser, and event and countdown logic use it. `unreadable` holds blocks that no longer match any schema: `readPage` sets them aside one by one and logs them, so the page still renders. They stay in the editor's document and never reach the live page.

## Saving

- **Lost responses:** a save sends a hash of the version it was based on. If the server's copy matches that hash, the earlier save did arrive, so it counts as this person's own save and not a conflict. Nothing else about conflicts changed: there's no revision column.
- **Backups:** each tab keeps its own in `localStorage`. Work based on an older version is offered back to the person to restore, download or discard.

- **Autosave:** the editor sends the whole document about a second after the last change. A typical page is small, so this is simple and cheap.
- **Two tabs or two teammates:** each save sends the `updated_at` it started from. If someone else saved first, the server refuses and the editor says so, instead of quietly overwriting their work.
- **Undo** stays in the browser and isn't stored.
- **Publishing:** check the document with the strict rules and the plan limits, then copy the draft to `published`.
- **Clicks:** links on a published page go through `/l/:handle/:id`, which reads the live page, adds one to `stats` and forwards. Nothing is cached yet, so each click reads the page from the database.
- **Unused photos:** nothing removes them yet. A cleanup job would compare stored files with the ones a person's pages mention.

## Limits

- I haven't measured save or read speed, and the "small document" claim is an estimate until real pages exist.
- Whole-document saves would need rethinking if real-time co-editing is ever wanted.
- Deriving `/l/` links from the live page changes decision 2 in `features.md` for page links. Standalone links still get one `links` table, and all clicks still land in `stats`.
- Finding every page that uses a given block type would mean scanning JSON. That's fine for occasional admin work, and an index can be added if it becomes frequent.
