# Tondo docs

Tondo gives a person or a team one address, such as `tondo.page/maya`, for a page of links with a designed look. A tondo is a circular painting, and that shape is the starting point for the brand. The repo is set up, and the product code is still a thin first version.

| File | What it covers |
|---|---|
| [qa.md](qa.md) | The checklist for testing the whole product, including what only a person can check |
| [roadmap.md](roadmap.md) | Where the product stands, what comes next and open decisions |
| [features.md](features.md) | Everything Tondo should eventually support, and the decisions that protects |
| [competitors.md](competitors.md) | Analysis of Liinks, Linktree, Beacons, Stan, Later and Shorby |
| [block-system.md](block-system.md) | The full proposed list of blocks, variants, controls and integrations |
| [builder-port.md](builder-port.md) | How the full builder was built: every block's layouts and fields, what was cut, and the order of work |
| [data-model.md](data-model.md) | How pages and blocks get saved, and why Postgres with JSONB fits |
| [teams-schema.md](teams-schema.md) | The decision on the teams schema: one `teams` table (option E), with the four earlier options kept as history |
| [teams-implementation.md](teams-implementation.md) | Built, with plans off until `PLANS_ON`: who pays, what stays online, who can do what, invitations, the shared look, Help me, what Terms and Privacy need, and open decisions |
| [plans.md](plans.md) | The current plans at the top: no Free plan, Starter, Pro per 5 pages and a 14-day trial. Below that, earlier decisions and competitor prices, as history |
| [plans-implementation.md](plans-implementation.md) | What's built for the current plans at the top, off until `PLANS_ON`, with no Stripe account yet. The earlier plan follows as history |
| [multi-page.md](multi-page.md) | The decision on several pages: own address per page (option 2), now built, with the other options, competitors, Home design and working defaults |
| [multi-page-implementation.md](multi-page-implementation.md) | Built: one address per page, routes and editor by page id, the switcher, New page, photos by page, the sitemap and tests, with what changed while building |
| [custom-domains.md](custom-domains.md) | Render against Cloudflare for SaaS, the choice of Render, how a page connects its own domain, what the owner sets up and what isn't verified |
| [ai-chat.md](ai-chat.md) | Help me, the AI chat for setting up and editing a page: what's built, architecture, UX, safety, costs, evals and what's left |
| [ai-blocks.md](ai-blocks.md) | Reference for AI chat: every block, section, header field, look and style choice, what the model may change and how a person asks |
| [inspector-design.md](inspector-design.md) | The original inspector design. `builder-port.md` is what was built |
| [how-it-works.md](how-it-works.md) | Product surfaces, data model, rendering, art and open decisions |
| [deploy.md](deploy.md) | How to set up Neon, Neon Auth and Render, and what is needed before it works |
| [repo-structure.md](repo-structure.md) | Folder layout, package boundaries and local ports |
| [design-language.md](design-language.md) | Competitor comparison, brand decisions, page looks and blocks |
| [design-brief.md](design-brief.md) | A brief to hand to a separate design agent |
| [design-languages/3-wash.html](design-languages/3-wash.html) | The original Wash study |

The prices on the site and the people on the example pages are placeholders.
