# Roadmap

This is the plan as of 2026-10-31. The design work and a first editor experiment exist. The monorepo is set up. `apps/editor` has the real iframe canvas with three blocks and two looks, and the rest still lives in `.scratchpad/editor/`.

The marketing page in `marketing/index.html` is the approved design direction. It sets the standard for the product, and it also shows more than the first release should build, so this plan says which parts come first.

## Order of work

### 1. Editor scratchpad

Started. A throwaway editor is in `.scratchpad/editor/`, with no server or accounts, and it saves to the browser's local storage. It hasn't been tried by anyone else yet. Ease of use is half of the product's goal and it's the part that hasn't been tested, so it comes before any infrastructure.

It covers one flow: start from an empty page, paste a few links, add a photo and a product, pick a look, reorder the blocks and see the result on a phone-sized preview.

It's finished when someone who hasn't seen it can make a page they'd share, without help, on a phone and on a laptop. We should watch at least a few people try it, because that result decides the editor's shape.

### 2. Shared page packages

In progress. `heading`, `button` and `link-card`, and the Madder and Dusk looks, are moved. Next, move the remaining blocks and looks out of `.scratchpad/editor/render.js` into `packages/page` and `render`. The editor preview and the example pages then use the same renderer, so the editor can't drift from the published result.

### 3. Art

Turn the paintings into proper recipes in `packages/art`, drawn in a real palette and rasterised at publish time. The marketing page's colour picker only shifts hue with a CSS filter, so the redraw it describes needs building here. Three strong recipes are enough for the first release.

### 4. Server and publishing

Build handles, sign-in, drafts and published versions, public pages, click counts and share images. The marketing site is already in `apps/marketing`, on 2026-10-31. Its 32 example pages and block showcase are static copies from `.scratchpad/tools/build-marketing.cjs`, and they should move to the real renderer as the builder port brings the blocks and looks across.

### 5. Private release

Invite a small group, with real pages replacing the fictional ones as people agree to it. Replace the demo photos and check any that stay.

### 6. After the private release

Teams, custom domains and then paid plans. Teams are part of the product's positioning, but the shared look depends on single pages working well first.

## Blocks

The full list, its phases and the integrations are in [block-system.md](block-system.md). It replaces the shorter list that was here.

## Decisions

Made on 2026-10-31, and open to change:

- **Design direction:** the marketing page as it stands, using Wash with the Madder palette.
- **Payments:** Tondo won't take payments in the first release. Product blocks link out, which keeps the first release free of checkout, tax and payout work. Payments follow connected accounts.
- **Editor first:** the scratchpad comes before the monorepo.

Still open:

- **Domain and name:** the domain is `tondo.page`. No trademark search has been run. This should happen before more work goes into the name, because it's cheap now and costly later.
- **Plans and prices:** the prices on the marketing page are placeholders.
- **Hosting:** compare providers for custom domains and edge caching before step 4.
