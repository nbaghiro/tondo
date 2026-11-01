# QA checklist

This is what to walk through now that the builder is in the real app. Everything marked "needs you" hasn't been tried by anyone yet. The automated tests run in Chrome with phone emulation, against a local stand-in for Neon and for object storage.

## Ready to test: Home and the dashboard

Start the servers (`pnpm services:up`, `pnpm db:migrate`, `pnpm dev`), then open http://localhost:8103. Check at 1440, 1100 and on a real phone.

1. **Sign up.** You land on the five-step start flow at `/start`. Finishing it opens the builder at `/edit`.
2. **Go to Home.** Use the Home button beside the logo in the builder. You should see "Not live yet", your address, a large phone showing your page as the main thing on the screen, and five checklist items. The phone has no buttons on it: Edit page is in the sidebar.
3. **Follow each checklist item.** Each should open the builder at that exact field. "Publish your page" opens the panel and doesn't publish until you press the button.
4. **Publish.** The panel shows your address, Copy link, Open your page and Back to Home.
5. **Check the numbers.** Home shows Live and the last 30 days. Open your page in another browser and wait a few seconds: views go up. Press a link: clicks and Analytics' Top links go up. Analytics has 7, 30 and 90 days, a Views or Link clicks toggle, and a table view.
6. **Make a change in the builder and go back to Home.** It says "Live, with unpublished changes" and offers Publish.
7. **Page settings.** Change the title and description, then publish and paste your link into a chat to see the preview. Change your address and check the old one is a 404. Take the page down.
8. **Account.** Change your password, log out, log back in. Log in lands on Home. Delete the account with a throwaway one.
9. **Phone.** Home shows the phone below your name, then your address and checklist. The bottom bar has Home, Edit page, Analytics and More. More has Page settings, Help and Account.
10. **Two tabs.** Edit in both. The second gets the conflict bar with Use the latest, Keep mine and Download mine.
11. **Report link.** A live free page has a small Report link at the bottom. It opens `/report`.

## Trying an example page in the builder

`pnpm examples:load <example> <handle>` copies an example page into the draft of a local account, so you can open it at `/edit` like any other page. For example, `pnpm examples:load lowtidesurf maya`. The example is the file's name in `apps/marketing/src/data/pages`, and the account must already have that address.

It replaces that account's draft and leaves its live page alone. It refuses to run with `NODE_ENV=production` or against any database that isn't on this machine.

A button or card with no link doesn't show on a live page, so these look the same as in the gallery until you give them one. Publishing asks for those links. Sections that show "Not available yet" use a block that isn't ready, and they stop a page publishing until they're removed.

## Deferred until after QA

- **Starter pages.** There are none for now, and no code exists for them.
- **Building before sign-up.** This also waits until QA has finished.

## Starting up

```sh
pnpm services:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`.env` needs `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` for the Neon `dev` branch, as `deploy.md` describes. Open everything at `localhost`, not `127.0.0.1`, so the sign-in cookie carries across.

| What | Where |
|---|---|
| Marketing site | http://localhost:8103 |
| Gallery | http://localhost:8103/gallery |
| Editor | http://localhost:8100 |
| Your published page | http://localhost:8101/yourhandle |
| Every layout in any look | http://localhost:8100/?blocks |
| Every field type | http://localhost:8100/?fields |

In development the marketing site and published pages are on different ports. In production they share one address.

## Account

- [ ] Sign up from the home page's claim box, with an email you can read. The address you typed should carry through
- [ ] The code arrives, a wrong code is refused, "Send a new code" works
- [ ] After the code, the start flow opens: name, sections, logo, look, address. The page fills in beside each step. A taken or reserved address is refused
- [ ] Sign up without an address from the marketing box. The last step suggests one from the name
- [ ] Log out and back in. You land on Home, not the start flow
- [ ] Make the builder window short. The phone keeps its proportions down to a 320 px screen, then the workspace scrolls to the rest of it, and dragging a section still lands where you drop it
- [ ] Log out, then log in. A wrong password is refused
- [ ] Forgot password: the code arrives, the new password works and the old one doesn't. **Needs you: never tried with a real code**
- [ ] An unverified account that logs in is sent to `/verify`
- [ ] Continue with Google, all the way through. **Needs you: never completed**

## Building a page

- [ ] Add one of each section from the Add list, and try every style tile. Anything marked Soon can't be chosen
- [ ] Paste a YouTube, Spotify, Calendly, shop, email and phone link into the box at the top of the list. Each should become a suitable section
- [ ] Edit text on the page, and in the panel. Each follows the other
- [ ] Drag a section by its handle on the page, by its row in the list, and from the Add list to a spot on the page. Undo and redo
- [ ] Hold a section on a phone to move it. A plain swipe should still scroll
- [ ] Keyboard: Delete removes, Cmd+D copies, Alt+Up and Down move, Escape deselects
- [ ] Links: add, reorder and remove links inside one section
- [ ] Under More options: rarer layouts, hide a section, schedule one, and highlight up to two
- [ ] Tabs: add tabs, click the second tab, add sections to it, rename and add a tab, drag inside a tab
- [ ] Preview, then back to editing

## Looks

- [ ] Make it yours: try each colour swatch, your own colour, From my photo, the fonts, button shape and fill, and each background. Reset goes back to the look's original
- [ ] Try a very pale and a very dark colour of your own on a dark look. Text should stay readable, on the published page too
- [ ] Open each of the 50 looks with your own content in place. Note which look wrong
- [ ] Try the filters, paint swatches, Paint it again and the reveal
- [ ] Header layouts in several looks, with and without a photo
- [ ] A long name in looks with seals and frames, such as Bakehouse, Lume and Rovers. Long names may overflow

## Header

- [ ] In Your name and links, the × clears the name, short line and About, and empty ones don't show on the live page. "Show my name" off hides the name on the page and keeps it as the page title
- [ ] Top of the page changes the art: Paint it again, paint colours, None, Soft fade or A photo. It matches Make it yours. Looks whose header is drawn without a painting don't offer painting or None

## Panels

- [ ] Every panel has the same space between fields, labels and hints, and nothing is clipped when you scroll to the end, on a computer and a phone
- [ ] The Look row looks like the section rows below it, with a small chip of your look's background and button colours that follows Make it yours
- [ ] On a computer, the left panel's arrow minimises it to icons. They select sections without expanding it, a dot marks a to-do, and it stays minimised after a reload. Phones don't change

## Selecting

- [ ] "Add below" sits in its own space under the selected section or header, and never covers text

- [ ] Click the background around the phone, or empty page inside it. The selected section deselects and the right panel closes, and text you were typing is kept. Clicks in the panels and top bar, a drag, and selecting text don't close it. On a phone, tapping empty page above the sheet closes it

## Adding sections

- [ ] Add a section has a search box that stays put while the list scrolls. It's focused on a computer and not on a phone. "cv", "newsletter" and a pasted Instagram link all find something, and Enter adds the top result

## Missing photos

- [ ] A new section with no photo shows a plain tile with a small image icon, in a light and a dark look, and the right panel shows "Add a photo"
- [ ] Publish with one left. You get a warning and can still publish. Your live page leaves it out of the header, single images, galleries, link cards and logos. Products, team, music and video keep the plain tile

## Saving

- [ ] Normal saves show nothing in the top bar. Reload, and your work is there. Go offline and make a change: a message appears, and it clears once you reconnect
- [ ] Stop the server (or go offline), edit, and see the warning. Bring it back, and it saves by itself
- [ ] Edit in two tabs. The second should say the page changed and offer Reload
- [ ] Open the editor in another browser while logged in as the same person

## Photos

- [ ] Upload a JPEG, PNG and WebP. Try a photo from a phone
- [ ] A large photo is shrunk, and rotated correctly if it came from a phone
- [ ] An SVG, a renamed text file and a file over 12 MB are all refused with a clear message
- [ ] Move the crop dot, then remove and replace a photo
- [ ] Uploaded photos appear under "Your photos" after a reload

## Publishing

- [ ] Publish with an empty button link. The panel lists it, and clicking the item opens that block
- [ ] Change one field in a section, such as a review's name, and publish. Your words show, sample words beside them don't, and the panel says what was left out
- [ ] Add a section and leave it untouched. Its row says "Not going live yet"
- [ ] Publish a page with only your name and a line about you
- [ ] Publish properly, then open the page in a private window
- [ ] Links open the right places, and the counts show in the panel the next time you publish
- [ ] Edit without publishing. The live page doesn't change, and the button says Publish
- [ ] Page title and description, under Page settings, show in the browser tab and page source
- [ ] A scheduled block appears and disappears at the right time on the live page
- [ ] Capital letters in an address redirect to the lowercase one

## Marketing site

- [ ] Home page: hero, filmstrip with hover slowdown and Pause, preview modal and its arrows
- [ ] Gallery: open pages, and compare with the list of changed pages in `builder-port.md`
- [ ] `/login`, `/signup`, `/forgot`, `/about`, `/support`, `/privacy`, `/terms`
- [ ] Footer and nav links

## Devices: needs you

Nobody has tried any of this on real hardware or in another browser.

- [ ] A real iPhone in Safari: the whole account and building flow. Open the dev server on your network as `deploy.md` describes
- [ ] A real Android phone in Chrome
- [ ] Safari on a Mac. Neon's docs say Safari blocks its cookies on plain HTTP, so local sign-in may fail there, and it needs testing on HTTPS after deploying
- [ ] Firefox on a computer
- [ ] Scrolling and dragging by touch, including the phone sheet's grip and list items
- [ ] A screen reader on the editor and on a published page

## Known gaps

These are expected, so they don't need reporting.

- **Sign-ups, forms, tips, embeds, inline calendars and time slots** render but do nothing, and only appear in the gallery. In the Add list they're marked Soon and can't be chosen.
- **The `file` block** shows as coming, and can't be added until files can be delivered.
- **Music** opens its link and doesn't play. **Maps** are drawings that open directions.
- **Connected accounts** don't exist, so gallery and video sources are typed in.
- **Editing before signing up:** the start flow runs after sign-up and verification. Whether someone can build first is a future decision.
- **Paint swatches** recolour the painting and not the rest of the page. Art is drawn on the visitor's phone, not rasterised.
- **Share images** aren't generated. A published page uses its header photo if it has one, and otherwise shares with text only.
- **Rollback:** publishing overwrites the live copy, by design for now.
- **Real legal and support pages** aren't written yet. Deleting an account is built, see below for what it can't remove.
- **Production:** nothing is deployed, Neon's production branch still has verification off, and R2 hasn't been set up.
