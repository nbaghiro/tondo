# Design cleanup log

Every request from the design cleanup round, so none get lost. It started on 2026-10-31.

| Status | Request | Where it ended up |
|---|---|---|
| Done | Slim scrollbars that match each surface | Marketing, demo pages, published pages and editor |
| Done | Selection outline shouldn't have a strange gap around a block | `.scratchpad/inspector/frame.css`. `apps/editor` already outlines the block itself |
| Done | Less rounding on page containers, everything else unchanged | Filmstrip, gallery, team screenshots and editor frame |
| Done | Hero fan keeps its larger rounding | `.fan` is 32px |
| Done | Team section pages all the same width | Three equal, undistorted screenshots in a row |
| Done | Replace the left hero card so it blends with the set | Marginalia Books replaced Small Rooms, then Stillwater Yoga |
| Done | Small paint overflow on the right of the hero | `.fan-art-right` |
| Done | Filmstrip left spacing matches the screenshot | Scales with the window, about 147px at the width in the screenshot |
| Done | Show a few variations of the blocks section to compare | Naib chose option B, warm looks only. It's in the site |
| For review | "How it works" and painting sections look like art with no design | Rebuilt around pieces of real interface and page cards |
| Done | Review example categories and expand the library to 50 | 50 pages in 7 groups. New pages are in `.scratchpad/tools/library-pages.cjs` |
| Done | Auth screens with email and password plus Google, demo pages as a tilted strip | `/login`, `/signup`, `/claim`. Google needs credentials before it can be tried for real |
| Done | Favicon from the marketing logo on every site and app | Marketing, editor and published pages |
| Done | A few logo alternatives to compare | Naib kept the painted roundel for the logo and favicon. The other directions are at `.scratchpad/logo/index.html` |
| Done | Variations of the auth screen's page strip: pages, style, zoom and quantity | Naib chose D, the dense wall. It's on `/login`, `/signup` and `/claim` |
| Done | Redesign Oskar Bloom's plain example page | Drawn flower header on tomato, with work shown as drawn product screens |
| Done | A way to try a real auth form in the strip demo | The demo's left side is the real form |
| Done | "Get started" and "Claim your link" go to sign-up | Both go to `/signup`, and a typed address carries through |
| Done | No box around the claim field when it's focused | The whole pill shows a soft ring instead |
| Done | Team avatars with faces centred | Square crops, `face-*.jpg` |
| Done | Clean footer with support, company and legal links | Links work. The legal pages are placeholders until real text is written |
| Done | Favicon should match the header logo | It now has a paper-coloured disc behind the painting, so a dark tab can't darken it |
| Done | Use `tondo.page` instead of `tondo.co` everywhere | Site, editor, docs and example screenshots rebuilt |
| Done | Use Neon's managed auth, and remove auth tables | Real sign-up, login and address claim tested on the `dev` branch. Google login not completed |
| Done | Better name than Examples | Gallery, at `/gallery`. Options: Gallery, Inspiration, Showcase, Explore |
| Done | Remove demo wording from the site | Removed, apart from one line on the gallery saying its people are fictional |
| Open before launch | Things the site now states without a caveat | Prices, Teams, Booking and other unbuilt features, and placeholder legal and support pages |
| Done | Neon project connected, with Auth on | Real sign-up, login and Google redirect tested on the `dev` branch. Claiming an address works too |
| Done | Finalise the data model | `users` and `pages`, with others added only with their feature. See `data-model.md` |
| Done | Sign up, verify email and reach the empty editor on local | Naib tested it with a real inbox. Required on the `dev` branch only so far |
| Done | Filmstrip scrolls by itself and slows on hover, with no manual scroll | Loops with a second copy of the cards. Stops for keyboard focus and reduced motion |
| Done | Clicking a page opens a preview | `PagePreview.astro`, shared by the strip and the gallery |
| Done | Example pages open at their own addresses | `/maya`, `/oskarbloom` and so on. Reserved, so people can't claim them |
| Done | Onboarding flow for new people | The start flow in `apps/editor`, after sign-up and verification |
| Done | Fuller gallery with smaller gaps and no labels | 12px gaps, and names stay available to screen readers |
| For review | Builder port step 3: one slice with the real inspector | Five blocks in four looks, in `apps/editor`. See `builder-port.md` |
| Waiting on Naib | Builder port steps 4 and 5: all blocks and all looks | Built, and stopped at the step 5 review |
| Done | Choose the site's design language | Naib chose Porcelain |
| Done | Finish the builder port, ready for full QA | Steps 6 to 10. See `qa.md` |
| Done | Review groups 1 and 2: broken panels, misleading live pages | See `review-2026-10-31.md`. Groups 3 to 5 are still open |

The site changes are in `apps/marketing`.
| Done | Move the approved builder into the real app | `apps/editor`, `packages/page/src/sections.ts`, `packages/render/src/style.ts`. See `builder-v2-port.md` |
| Done | Rename Find me to Socials and contact, findable by instagram, social, socials, icons and contact | `packages/page/src/sections.ts` |
| Done | Give the header's links their own Social icons row, opened by tapping the icons | `SectionPanel.tsx`, `Canvas.tsx` |
| Done | Make Porcelain the default for the marketing site and the whole app | `packages/brand/styles/tokens.css` is the source. See `design-language.md`. Example pages keep their own looks |
