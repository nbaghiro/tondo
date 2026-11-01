# QA checklist

This is what to walk through now that the builder is in the real app. Everything marked "needs you" hasn't been tried by anyone yet. The automated tests run in Chrome with phone emulation, against a local stand-in for Neon and for object storage.

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
- [ ] Sign up without an address, and choose one on `/claim`. A taken or reserved address is refused
- [ ] Log out, then log in. A wrong password is refused
- [ ] Forgot password: the code arrives, the new password works and the old one doesn't. **Needs you: never tried with a real code**
- [ ] An unverified account that logs in is sent to `/verify`
- [ ] Continue with Google, all the way through. **Needs you: never completed**

## Building a page

- [ ] Add one of each block from the shelf, and try every layout tile
- [ ] Paste a YouTube, Spotify, Calendly, shop, email and phone link into the shelf's paste box. Each should become a suitable block
- [ ] Edit text on the page, and in the panel. Each follows the other
- [ ] Drag blocks on the page, and drag from the shelf. Undo and redo
- [ ] Keyboard: Delete removes, Cmd+D copies, Alt+Up and Down move, Escape deselects
- [ ] Show or hide: hide a block, schedule one, and highlight up to two
- [ ] Tabs: add tabs, click the second tab, add blocks to it, rename and add a tab, drag inside a tab
- [ ] Preview, then back to editing

## Looks

- [ ] Open each of the 50 looks with your own content in place. Note which look wrong
- [ ] Try the filters, paint swatches, Paint it again and the reveal
- [ ] Header layouts in several looks, with and without a photo
- [ ] A long name in looks with seals and frames, such as Bakehouse, Lume and Rovers. Long names may overflow

## Saving

- [ ] The status goes from Saving to Saved. Reload, and your work is there
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

- **Sign-ups, forms, tips, embeds, inline calendars and time slots** render but do nothing, and only appear in the gallery. They aren't in the shelf.
- **The `file` block** records a file's name and doesn't store the file, so its download goes nowhere.
- **Music** opens its link and doesn't play. **Maps** are drawings that open directions.
- **Connected accounts** don't exist, so gallery and video sources are typed in.
- **Onboarding:** a new page starts empty, and the name comes from the email address.
- **Paint swatches** recolour the painting and not the rest of the page. Art is drawn on the visitor's phone, not rasterised.
- **Share images** aren't made, and a published page has no social preview picture.
- **Rollback:** publishing overwrites the live copy, by design for now.
- **Deleting an account** isn't built. Neither are real legal and support pages.
- **Production:** nothing is deployed, Neon's production branch still has verification off, and R2 hasn't been set up.
