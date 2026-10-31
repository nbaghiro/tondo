# Design brief for Tondo

You are designing the visual language for Tondo, a new link-in-bio product. Work as a design lead with a strong point of view. Your job is to show me directions I haven't already seen, so make deliberate choices and explain them.

## The product

Tondo gives a person or a team one address, such as `tondo.page/maya`, for a page of links with a designed look. People put that address in their social media bios, email signatures and printed materials.

The two goals that outrank everything else are:

1. **Beautiful design.** A new page should look designed from the start, even if its owner makes no design decisions.
2. **Ease of use.** Someone should be able to claim a name, add links, choose a look and share the page in a few minutes, including on a phone.

Tondo is not built yet, so treat every feature below as planned.

## The name

Tondo is the name, at `tondo.page`. A tondo is a circular painting, from the Italian *rotondo*, meaning "round". The circle and the idea of a painting are the natural starting points for the brand, but they don't have to be used literally.

Please don't suggest a different name. Say it "TON-doh". The word is capitalised as a normal name: Tondo.

## Who it's for

- **Individuals:** creators, artists, makers, photographers, coaches and independent professionals.
- **Teams:** small businesses and studios that want a page for each person and a consistent look across all of them.

## How it works

1. Claim a name, such as `tondo.page/maya`.
2. Add links and other blocks. Pasting a URL fills in the title and icon where the platform is recognised.
3. Choose a look, which sets the colours, type, shapes and background together.
4. Publish and share the address.

Planned blocks are links, a row of social icons, headings, text, images, video and music embeds, and forms.

Pages also have a QR code, click counts and optional custom domains.

For teams, each person has a page, and a shared look can be changed once to reach all of them. Owners decide who can edit what. A team can also have its own page listing its people.

## The main idea to design around

Every look starts with a painting. Backgrounds are generated from a recipe, a colour palette and a seed, so two people using the same look get different pictures. Changing one colour redraws the art and updates the rest of the page. This is the feature most likely to set Tondo apart, so the art needs to look good, not merely decorative.

## The market

- **Linktree** is the best-known product. It's large and has a free plan, and its pages often look alike.
- **Liinks** (`liinks.co`) is the reference I've been looking at. It has soft pink, blue and lilac gradients, tilted phone mockups, a claim-your-name field in the hero and a large, bold sans headline. It has no free plan.
- **Bento** was known for a grid of visual blocks. Linktree bought it and closed it in February 2026.

Tondo should be easy to tell apart from all of these.

## Explored so far

I've looked at ten studies. Treat these as context, not limits, and don't just restyle them.

- **Salon:** painted gallery walls and gold round frames.
- **Pigment:** flat colour fields and huge overlapping circles.
- **Wash:** watercolour blooms on pale paper. This is the one I'm currently leaning towards, because it feels soft, friendly and approachable.
- **Cutout:** hand-cut paper shapes in the spirit of Matisse.
- **Eclipse:** a glowing ring against deep violet.
- **Wash variations:** Indigo (blue with thin ink outlines), Madder (rose and sienna with hand-drawn borders), Sap (greens with arched cards), Dusk (glowing paint on midnight blue) and Sumi (black ink rings on white).

The main risk with Wash is that soft colour can look too close to Liinks. CSS and SVG blobs also tend to look like digital blurs rather than paint, so this needs real attention.

## What I want from you

Produce **three distinct directions**. Include at least one that develops the soft, painterly feeling and at least one that goes somewhere I haven't listed.

For each direction, provide:

1. **A short rationale:** the idea behind it, why it suits Tondo, and its main risk.
2. **A logo and wordmark:** including how it looks at favicon size.
3. **A design system summary:** named colours with hex values, typefaces and their roles, corner and border treatment, shadows or depth, and motion.
4. **A marketing homepage:** responsive and complete, using the copy below.
5. **Three sample Tondo pages at phone size:** one for each sample person below. They should look like different people's pages within the system, and they matter more than the marketing page.
6. **The art:** at least six paintings showing how the look varies from page to page.
7. **One editor screen at phone size:** adding a link and choosing a look, to show that ease of use is taken seriously.

## Copy to use

You may improve the wording, as long as it stays plain and accurate.

- **Navigation:** Examples, Teams, Pricing, Log in, Get started
- **Headline:** One link to everything you do, on a page that looks like yours.
- **Supporting line:** Add your links, choose a look and share one address. Tondo takes care of the design.
- **Name field:** `tondo.page/` with the placeholder `maya`, and the button "Claim your link"
- **How it works:**
  1. Claim your name. Choose your address, like tondo.page/maya.
  2. Add your links. Paste a link and Tondo fills in the title and icon.
  3. Choose a look. Each look sets the colours, type and background together, so everything matches.
- **Art section:** Every look starts with a painting. Backgrounds are drawn for your page, so two people using the same look get different pictures. Change one colour and the rest of the page follows.
- **Teams section:** One look for the whole team. Give everyone their own page and keep them consistent. Change the team's look once and it reaches every page. Owners decide who can edit what.
- **Pricing section, "Free to start":**
  - Free, $0: one page, all block types, a set of core looks
  - Pro, $6 a month: custom domain, click analytics, no Tondo mark
  - Team, $4 a person: a page for each person, shared looks, roles and permissions
- **Closing:** Claim your link
- **Footer note:** Design study. Prices, features and people are placeholders.

### Sample people

These people are fictional.

- **Maya Okafor,** ceramicist in Vancouver: New work, Studio sales, Workshops, Newsletter
- **Theo Lindqvist,** film photographer: Prints, Portfolio, Book a shoot
- **Aster & Bell,** floral studio and a team: Weddings, Shop, Our team

## Voice

Write plainly and warmly, as an engineer and founder explaining the product to someone they respect. Say what things do. Avoid slogans, punchlines, rhetorical questions, hype, superlatives and claims of effortless simplicity. Don't use em dashes.

Don't invent customer counts, testimonials, ratings, press logos or results. The product has no customers yet.

## Avoid

- Default AI-looking design: cream backgrounds with terracotta accents, near-black with one neon accent, and rows of identical rounded cards with soft grey shadows.
- All-caps labels above headings, and accenting one word of a headline in italics or colour.
- Numbers on content that isn't a sequence, and arrows added to button text.
- Effects everywhere. One memorable idea with quiet surroundings is better.
- Stock photography of people. Use art, or clearly marked placeholders.

## Constraints

- Design phone-first. Most visitors reach these pages from a social media app on a phone.
- Tondo's own brand and the looks people apply to their pages can differ. The system needs enough range for many personalities, and a person's content should remain the focus of their page.
- Published pages will be server-rendered HTML and CSS, and the art will be saved as an image or SVG at publish time. Visitors' phones shouldn't need to run heavy effects, so avoid designs that depend on WebGL or large JavaScript at view time.
- Text must meet WCAG AA contrast, including text over art. Show visible keyboard focus and respect reduced motion.
- Layouts must hold from 360 px to wide desktop with no sideways scrolling.

## How to deliver

Give me self-contained HTML files I can open directly, along with an index page linking to each direction. Check your work in screenshots at phone and desktop widths and fix what you find before you finish. Finish by telling me which direction you'd choose and why, and what you weren't able to finish or verify.
