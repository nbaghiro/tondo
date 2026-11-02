import type { LookName } from "@tondo/page";
import { looks } from "./looks";
import { lookVars } from "./style";

// One line per look for the assistant, since the looks hold no words about what they suit. The
// intent lines are hand-written from the example page each look was made for.
const INTENT: Readonly<Record<LookName, string>> = {
    porcelain: "Clean white, plum ink and rose paint, in a soft serif. A calm place to start.",
    madder: "warm and painterly, for makers and ceramicists",
    dusk: "calm night sky, for writers and musicians",
    sumi: "quiet ink on paper, for artists and designers",
    sap: "fresh botanical, for florists and couples",
    indigo: "clear and professional, for consultants and academics",
    bake: "cheerful and rounded, for bakeries and food",
    noir: "dark and elegant, for photographers and film",
    signal: "loud yellow poster, for studios and events",
    surf: "sunny retro, for surf schools and outdoor fun",
    roast: "rich dark brown, for cafes and coffee",
    lilac: "soft and restful, for yoga and wellness",
    fern: "deep forest green, for nature and outdoor work",
    atelier: "dusty pink and refined, for fashion and vintage",
    vellum: "soft and formal, for weddings and invitations",
    plaster: "muted and architectural, for interiors",
    lagoon: "clean and modern blue-green, a good all-rounder",
    tide: "bold teal, for causes and community groups",
    brine: "cool and coastal, for seafood and seaside places",
    lume: "warm olive, for restaurants and wine",
    harvest: "earthy stencil, for farms and markets",
    wax: "dark and golden, for candles and craft goods",
    shelf: "deep red and gold, for bookshops",
    press: "newspaper style, for newsletters and writers",
    postal: "friendly stamp style, for teachers and language tutors",
    counsel: "formal letterhead, for lawyers and advisers",
    calm: "gentle sage, for therapists and counsellors",
    ledger: "tidy and numeric, for accountants",
    estate: "navy and gold, for property and finance",
    office: "plain and useful, for small companies",
    bloom: "bold floral red, for florists and bright brands",
    cutout: "paper collage, for illustrators and artists",
    riso: "punchy print, for bands and zines",
    nix: "glossy red, for beauty and nail studios",
    comet: "loud and playful, for food trucks",
    second: "dark green with slab letters, for barbers",
    ink: "black and red, for tattoo studios",
    rave: "neon on dark, for DJs and nightlife",
    volt: "dark with acid green, for fitness and coaches",
    pixel: "arcade style, for gamers and streamers",
    conf: "bright orange ticket, for conferences",
    rivet: "plain and sturdy, for trades",
    trail: "outdoorsy tan, for hiking and guides",
    smile: "fresh and clean, for dentists and clinics",
    keys: "dark and classical, for music teachers",
    crumb: "homely brown, for schools and home cooking",
    biscuit: "sunny and rounded, for pets and groomers",
    glass: "deep blue with gold, for churches and choirs",
    rovers: "team colours, for sports clubs",
    stacks: "bookish green and purple, for libraries",
    scrap: "handwritten scrapbook, for personal pages",
};

/** One line per look, marking dark ones so "something darker" has an answer. */
export function lookCatalogue(): string {
    return (Object.keys(INTENT) as LookName[])
        .map((name) => {
            const look = looks[name];
            const dark = lookIsDark(lookVars(name, look)["--bg"]) ? "dark, " : "";
            return `${name} (${look.label}): ${dark}${INTENT[name]}`;
        })
        .join("\n");
}

function lookIsDark(colour: string | undefined): boolean {
    const hex = /^#([0-9a-f]{6})$/i.exec(colour ?? "")?.[1];
    if (!hex) return false;
    const value = Number.parseInt(hex, 16);
    const brightness =
        (((value >> 16) & 255) * 299 + ((value >> 8) & 255) * 587 + (value & 255) * 114) / 1000;
    return brightness < 110;
}
