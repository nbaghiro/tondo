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
| Done | Readable text in every unchanged look | Surf, Riso, Cutout, Comet, Trail, Smile and Bloom now pass 4.5:1, and the test covers all 50 looks with no exception |
| Done | Fix what the re-walk found: live page crash, sample content, publish lists | Sample content is now checked field by field. See `review-2026-10-31.md` |
| Done | Home, Analytics, Page settings and Account in the real app, on a left sidebar | `apps/editor/src/app/nav.ts` is the registry. Home is `/app`, the builder is `/app/edit`, the start flow is `/app/start` |
| Done | Review group 3: saves, unreadable blocks, Neon outages, limits, handles, unpublish, delete, report, time zones | See `review-2026-10-31.md` and the limits in `deploy.md` |
| Done | Look tiles redrawn from the real renderer | `pnpm looks:images` |

The site changes are in `apps/marketing`.
| Done | Move the approved builder into the real app | `apps/editor`, `packages/page/src/sections.ts`, `packages/render/src/style.ts`. See `builder-v2-port.md` |
| Done | Rename Find me to Socials and contact, findable by instagram, social, socials, icons and contact | `packages/page/src/sections.ts` |
| Done | Give the header's links their own Social icons row, opened by tapping the icons | `SectionPanel.tsx`, `Canvas.tsx` |
| Done | Make Porcelain the default for the marketing site and the whole app | `packages/brand/styles/tokens.css` is the source. See `design-language.md`. Example pages keep their own looks |
| Done | Lead Home with a large phone that has no buttons on it | `HomePage.tsx`, `shell.css`. Edit page stays in the sidebar and the bottom bar |
| Done | Keep the builder phone in proportion, and let short windows scroll to all of it | `builder.css`, with a test in `tests/editor.spec.ts` |
| Done | Let the header panel clear its words, hide the name and change the art | `hideName` in `schema.ts`, `headerArtChoices` in `render/src/header.ts`, `TopArt` in `LookPanel.tsx` |
| Done | Replace painted stand-in photos with a quiet tile | `photoStandIns` in `packages/render/src/style.ts`. Painted wordmarks and look art keep their painting. Run `pnpm looks:images` only when a look changes, since it will redraw the tiles without stand-ins |
| Done | Remove "Saved" from the builder bar | It stays as a hidden status announcement, and problems still show |
| Done | Bring all Tondo text to 4.5:1, and remove blush tints and navy shadows from the app | Faint and amber are darker. `scripts/contrast.test.ts` and `tests/contrast.spec.ts` check it. The dashboard now uses the shared soft, faint and line tokens |
| Done | Make log out end the session, and say so when it can't | `.then(leave, leave)` left on any failure with the cookies in place, so the next `/login` went straight back in. `POST /api/auth/sign-out` in `apps/server/src/auth.ts` now clears all Neon cookies even if Neon fails (502, `ended: false`, and the login page says so), refuses other sites, and the editor stays put with a message if the server can't be reached. Other tabs follow, and back re-checks. The signed cache lasts up to 5 minutes: a copied or other-device token and cache pair keeps working that long after log out or account deletion, and in that window a deleted person's `/me` shows no address |
| Done | Same phone on Home, the builder, the preview and the start flow | `components/Phone.tsx` and `styles/phone.css` are the only source. On a computer, Home matches the builder's size, and it stacks at 1240px or narrower instead of shrinking |
| Done | Bring Home's right side closer to the phone, keeping each side vertically centred | `.home` in `shell.css`: the two sit together with a 72px gap |
| Done | Collapse the builder's left panel to icons | `Rail` in `Panels.tsx`, kept per browser. Dragging to reorder from the rail isn't built. Phones keep their sheet |
| Done | Align the tiles | `.bgs` and `.styles` align to the top, labels stay on one line, and "The look's art" is now "Look's art" |
| Done | Quiet the Look row, give "Add below" its own space, and set one spacing rhythm for panels | `LookMini` in `Panels.tsx`, `canvas.css`, and the gap variables in `fields.css` |
| Done | Give Help me a proper place on Home | The bare link sat between two cards with no space. It's now one quiet row under "Finish your page", drawn like the rows inside it with the builder's spark, so the checklist still leads. Hidden when the assistant isn't available |
| Done | Close the left panel into the top bar, with an x instead of an arrow | Replaces the icon rail. A list button in the bar brings the panel back |
| Done | Smaller gap between undo and redo | `.undo-redo` in `builder.css` |
| Done | Cleaner way out of Preview | A small x at the top right, and Escape, so the phone sits centred on its own |
| Done | Say what's decided about plans on the pricing page and Home | `data/plans.ts` holds the table. Free, Pro and Team now show the decided limits, the page says paid plans can't be bought yet and everything that works today stays open until they can. Pages per plan isn't advertised while the owner settles how multiple pages work |
| Done | Let people remove a photo from Your photos, and say Pro in the gallery | The picker has a small x on each of your photos, refused with a clear line while the photo is on your page. `gallery.astro` marks example pages using a Pro look |
| Done | App logo goes to the site, and the site offers Go to app when signed in | `Shell.tsx`, `Nav.astro`. The builder's logo still goes to Home |
| Done | One address for the site and the app, no subdomains needed | Already how production works. `deploy.md` says so, and the e2e suite runs against that one server |
| Done | Show what needs Pro, and offer a way on at publish | Small Pro labels on looks, colours, fonts, Shop and the others, the schedule and longer statistics, a publish panel with Get Pro and Publish with free choices, a preview of those choices, Home notices when a plan ends, and a quiet plan line in the sidebar. All hidden while `PLANS_ON` is off |
| Done | Add the Tondo mark, and step a live page's design down 30 days after a plan ends | A small Made with Tondo above the report link in the look's own text colour, with no script. All worked out when the page is read, so nothing is rewritten. Hidden while `PLANS_ON` is off |
| Done | Connect plans to Stripe, tested against a stand-in | Pay from the publish panel, a Plan section on Account with Manage billing, a failed-payment notice on Account and Home, and deleting an account cancels its plan first. Hidden while `PLANS_ON` is off. No real Stripe account has been used |
| Done | Give each page its own address, ready for several pages | No visible change with one page, apart from links carrying `?page=` and deleting an account now asking for your email instead of your address |
| Open before launch | Teams pages read as finished, with no coming or draft wording | `teams.astro`, `Teams.astro`. These state features that aren't built, so the site can't go live until teams is |
| Done | One header across the marketing site, with the current tab marked | `.wrap` is 1320px everywhere, and `Nav.astro` marks the current page |
| Done | Apply the simplified plans: Free builds with no live page, Starter and Pro put pages online | All design gating, the mark and step-down are gone. Publish on Free offers Starter or Pro, monthly or yearly, and a second page on Starter offers Pro. A lapsed page goes offline with its content kept, Home says how to bring it back, and visitors see one plain note at any address with no live page. Behind `PLANS_ON`, tested against a stand-in. See `plans-implementation.md` |
| Done | Replace the art columns on Pricing with plan cards | `PlanCards.astro`, used on Pricing and Home, with one quiet paint wash behind the row |
| Open before launch | The marketing site states paid plans and teams as available, with no "coming" or "can't be bought yet" wording | Pricing, Home, About, Support and Teams. Team features, paying and the support address aren't ready, so the site can't go live until they are. Unbuilt non-team features were removed from the pricing table |
| Done | Page switcher in Edit page's place, with a pencil beside the phone | `PageSwitcher.tsx` in the sidebar, the phone's top bar and beside the address in the builder. Analytics and Page settings gain an Edit page button, and the greeting uses the person's name |
| Done | New page, with Copy this page and Delete this page in Page settings | `NewPageModal.tsx`. Free is offered a plan, and at 5 pages it says to delete one |
| Done | Look picker tiles had the avatar dot on "Your name", with names cut off behind the sample | The tile pictures now show only the look's art, redrawn with `pnpm looks:images` |
| Done | Bring back the earlier Look row in the builder's left panel | A bordered card with a wide tile of the look's art, Look with its name, and a chevron. The closed panel's rail keeps its small chip |
| Done | Keep each page's photos in its own folder | Image addresses no longer connect a person's pages, unless one photo is used on both. Your photos lists all of them, and the limit counts them together |
| Done | List live pages for search engines | `/sitemap.xml` and `robots.txt` |
| Done | Move Home's edit pencil next to the copy and open buttons | `.status-acts` in `HomePage.tsx`. A phone still uses its bottom bar |
| Done | Page avatars in the switcher looked like the Tondo logo | A rounded square with the page's header photo, or its look's art with the first letter of its name, in the sidebar, phone bar and builder |
| Done | Use the near-white pages for the Teams hero, with better portraits | Aster & Bell, June and Rae use Madder's plain colour style and the full photo layout. New warm portraits are centred above the fade, and the Teams look demo opens on the same style |
| Open before launch | The site sells your own domain on Pro | Not built yet. Queued after teams |
| Done | New page goes through the same full-screen onboarding as a new sign-up, and the small modal is removed | `StartFlow.tsx` at `/app/start?page=<id>&back=<screen>`, with Cancel for people who have pages. The limit prompt is `PageLimitPrompt.tsx`, and Copy this page has its own form in Page settings, `CopyPageForm.tsx` |
| Done | A more visible Help me icon | A painted roundel with a white star, `HelpMark.tsx`, on Home and in the builder bar. The pressed button gets a pale fill |
| Done | Expand the gallery from 50 to 75 pages, weighted towards common kinds of user | 25 new pages in `apps/marketing/src/data/pages`, each with a different look, and 11 plain groups in place of 7. New photos are from Pexels and listed in `packages/brand/photos/credits.md`. Home's strip now shows a selection of 30 so it stays light, and the sign-in wall still shows 56 |
| Done | No Free plan, packs of 5 pages on Pro, a 14-day trial and a badge on live pages | `limits.ts`, `billing.ts`, Account and the New page prompt. Against the stand-in only |
| Done | Pricing: two cards with a monthly and yearly switch, one line about adding pages, and a fuller Questions section | `PlanCards.astro`, `Faq.astro`, `pricing.astro`, Home and Teams |
| Done | Pricing belongs with Home and Teams | Paint and real example pages frame the cards, with one recommended plan, tick bullets, and Questions on a tinted band |
| Done | A Team screen, invitations and team pages in the switcher | `TeamPage.tsx`, `JoinPage.tsx`, `PageSwitcher.tsx`, as in the marketing window |
| Done | Onboarding starts on a Porcelain look with a filled page, with its own sample words for each answer to "What's it mostly for?" | `starters.ts`, `porcelain.ts`, `StartFlow.tsx`, `LivePage.tsx` |
| Done | Home shows sample content before a page goes live, and starters get social icons and two buttons where they led with links | `HomePage.tsx`, `starters.ts` |
| Done | Soft buttons on new pages, with Rows, Card and Lead and controls for words and arrow, and Preview shows sample content | `button.ts`, `style.ts`, `LookPanel.tsx`, `Preview.tsx` |
| Done | No broken links on the marketing site, such as block previews going to made-up addresses | Block previews on Home open their example page. Made-up links on example pages stay put and show a note, in `lib/pages.ts`. `marketing.spec.ts` walks every link and image |
