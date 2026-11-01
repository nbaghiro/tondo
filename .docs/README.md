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
| [teams-implementation.md](teams-implementation.md) | Plan, not yet built: schema, addresses, who can edit what, routes, edge cases, the shared look, screens, invitations, billing, tests, copy and milestones |
| [plans.md](plans.md) | Subscription options with current competitor prices and estimated costs. The owner chose option A on 2026-11-01 |
| [plans-implementation.md](plans-implementation.md) | M0 to M5 are built, off until `PLANS_ON`, with no Stripe account yet: schema, limits, publish-time payment, Stripe, the mark, tests, what the owner must set up, and milestones. Multiple pages are in multi-page-implementation.md |
| [multi-page.md](multi-page.md) | The decision on several pages: own address per page (option 2), with the other options, competitors, Home design and working defaults |
| [multi-page-implementation.md](multi-page-implementation.md) | Plan: P1 and P2 are built (one address per page, routes and editor by page id). Home's switcher, photos and the rest are on hold while the plans change |
| [inspector-design.md](inspector-design.md) | The original inspector design. `builder-port.md` is what was built |
| [how-it-works.md](how-it-works.md) | Product surfaces, data model, rendering, art and open decisions |
| [deploy.md](deploy.md) | How to set up Neon, Neon Auth and Render, and what is needed before it works |
| [repo-structure.md](repo-structure.md) | Folder layout, package boundaries and local ports |
| [design-language.md](design-language.md) | Competitor comparison, brand decisions, page looks and blocks |
| [design-brief.md](design-brief.md) | A brief to hand to a separate design agent |
| [design-languages/3-wash.html](design-languages/3-wash.html) | The original Wash study |

The prices on the site and the people on the example pages are placeholders.
