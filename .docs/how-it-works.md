# How Tondo would work

This is mostly a proposal. The server, database and renderer exist in a thin first version, and [repo-structure.md](repo-structure.md) describes what is set up.

## Goals

Beautiful design and ease of use come first. A new person should be able to claim a name, add links and share a good-looking page without making design decisions. A public page should also load quickly in the in-app browsers of Instagram and TikTok, because that's where many of its visits start.

## Surfaces

| Surface | Address | Purpose |
|---|---|---|
| Marketing | `tondo.page` | Explains the product and lets someone claim a name |
| Editor | `tondo.page/app` | Edits pages, looks, team members and domains. It has to work well on a phone |
| Public page | `tondo.page/maya` or a custom domain | Server-rendered HTML and CSS, with no framework sent to the visitor |

## How a page is made

1. Someone claims a handle, which creates their user row and an empty page.
2. They add blocks. Pasting a URL fills in the title and icon where the platform is recognised.
3. They pick a look, which sets colours, type, shapes and the art recipe together.
4. Publishing copies the draft to the live page, renders its art and share image, and refreshes the cached page.

The draft and the published version are separate, so editing never changes the live page until the person publishes.

## Data model

- **user:** one person and their unique handle. Their email and password live in Neon Auth.
- **page:** a user's draft and published content. A user has a main page and can gain sub-pages.
- **block:** a typed item stored in the page's JSON. The first set is listed in [roadmap.md](roadmap.md).
- **look:** colour, type, shape and art settings. A team look can be shared by many pages, so one change reaches all of them on the next publish.
- **art:** a recipe, a palette and a seed. The seed makes each page's picture different while keeping it reproducible.
- **domain:** a custom hostname linked to a page.
- **click:** a daily count per block, for analytics.

Blocks live in JSON rather than in their own table because they're always read and written with their page.

## Rendering

One function turns a page version into HTML and CSS. It has no DOM dependency, so the server uses it for public pages and the editor uses it for its live preview inside an iframe. That keeps the preview and the published page in agreement.

I'm proposing a new renderer instead of Galleo's engine. Galleo's published pages are client-rendered, and the viewer currently costs about 167 KB of gzipped JS because every element is registered. A single column of blocks doesn't need its absolute-layout solver, and normal browser layout can handle it. As a starting target, a public page should send under 50 KB before images. That number is a goal, not a measurement.

## Art

Art is the feature most likely to set Tondo apart, and it's new work: the Galleo review found no shader, texture or generative background system.

A recipe is a small function that takes a palette and a seed and returns SVG. On publish, the server rasterises anything expensive to a compressed image, so visitors' phones never run the generator. Changing one colour redraws the art with the same seed, so the composition stays familiar. The share image is made from the same art.

The first release needs only a few recipes that are good on real content. Adding more is cheaper than fixing weak ones later.

## Clicks and privacy

Links go through a short redirect, `tondo.page/l/:id`, which adds one count and sends the visitor on. It works without JavaScript and needs no cookies. The tradeoff is one extra network hop per click, so the handler has to be fast, and the page's HTML shows the redirect rather than the destination. Visitor analytics stay as aggregate counts with no visitor profile.

## Accounts and sign-in

People sign in with an email and password, or with Google, through [Neon Auth](https://neon.com/docs/auth/overview), which is a managed service built on Better Auth. People, passwords and sessions live in Neon's `neon_auth` schema, and Tondo keeps only workspaces, members and addresses.

- **One origin.** Neon's docs say separate frontend and backend deployments aren't supported, because its cookies can't be shared safely across domains. So the browser never talks to Neon directly. `apps/server/src/auth.ts` proxies `/api/auth/*` to Neon using the toolkit in `@neon/auth/server`, and the cookies stay on our own domain. In production one Render service serves everything. In development Vite and Astro proxy `/api` to the server.
- **Sessions.** The server reads the session through the toolkit, which keeps a signed copy in a cookie for 5 minutes, so most requests don't reach Neon. A session ended somewhere else can stay valid here until that copy expires.
- **Verification and password reset** use emailed codes, on `/verify`, `/forgot` and `/reset`. Unverified people get no session. This is required on the `dev` branch, and production needs the same setting before launch.
- **Sign-up** happens in Neon, then the browser claims the address. The `users` row is created at that point, and `users.id` holds Neon's user id with no foreign key.
- **Google** returns to `/api/v1/auth/return`, which finishes the sign-in, claims any address chosen earlier, and sends the person on.
- **Screens** are `/login`, `/signup` and `/claim` in `apps/marketing`, with our own design. They call Neon's endpoints through the proxy without the browser SDK.

Local development needs a real Neon project for sign-in, even though app data stays in Docker. Without `NEON_AUTH_BASE_URL` the site runs and sign-in says it isn't set up.

Not built yet: password reset and email verification screens, and terms and privacy text. Neon supports both flows, and needs our own email provider for verification links. The editor saves drafts in the browser, per address, and not on the server yet. [deploy.md](deploy.md) has the setup steps.

## Handles and abuse

- Handles are lowercase, normalised and checked against a reserved list that includes every top-level route.
- Link pages attract phishing, so destination URLs are checked against a threat list on publish, with a report link on every free page.
- New accounts have limits on page count and form submissions until they've built up some history.

## Teams

Teams aren't modelled yet. [data-model.md](data-model.md) says what they'll change.


A team would have a shared look, a member list and one page per person. Owners choose whether members can change only their links or their whole page. A team also has its own page, such as `tondo.page/asterandbell`, which lists its people.

## What comes from Galleo

| Asset | Plan |
|---|---|
| Theme tokens and contrast handling (`model/theme.ts`) | Copy and adapt. Its restrained taste may need widening for personal pages |
| Self-hosted fonts | Copy a small subset. All 45 families and 5.2 MB aren't needed |
| Media search and AI images (`services/core/media.ts`) | Copy the provider code once the editor needs it. It needs separating from Galleo's service layer |
| Component library (`@ui`) | Copy the pieces the editor uses, if the editor stays on SolidJS |

Galleo is a single package using path aliases, so sharing live code would first mean restructuring it. Copying is simpler for now, at the cost of fixes needing to be made in both places.

## Proposed stack

| Part | Choice | Reason |
|---|---|---|
| Monorepo | pnpm and Turbo | Same setup as Buta |
| API and public pages | Hono, TypeScript | Used in Galleo and Buta, and can render HTML strings directly |
| Editor | SolidJS and Vite | Lets it reuse Galleo's components |
| Marketing | Astro | Static output, same as Buta |
| Database | Postgres and Drizzle | Used in Galleo and Buta |
| Assets | Object storage behind a CDN | Art, share images and uploads |

## Open decisions

1. **Domain.** The domain is `tondo.page`, decided on 2026-10-31. No trademark search has been run.
2. **Plans.** The prices on the design pages are placeholders. Liinks charges $5 and $12 a month with no free plan. Linktree has a free plan and three paid ones.
3. **Hosting.** Custom domains need certificate handling, and public pages benefit from edge caching. Both should be compared across providers before the host is chosen.
