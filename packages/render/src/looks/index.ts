import type { LookName } from "@tondo/page";
import type { Look } from "../define-look";
import { atelier } from "./atelier";
import { bake } from "./bake";
import { biscuit } from "./biscuit";
import { bloom } from "./bloom";
import { brine } from "./brine";
import { calm } from "./calm";
import { comet } from "./comet";
import { conf } from "./conf";
import { counsel } from "./counsel";
import { crumb } from "./crumb";
import { cutout } from "./cutout";
import { dusk } from "./dusk";
import { estate } from "./estate";
import { fern } from "./fern";
import { glass } from "./glass";
import { harvest } from "./harvest";
import { indigo } from "./indigo";
import { ink } from "./ink";
import { keys } from "./keys";
import { lagoon } from "./lagoon";
import { porcelain } from "./porcelain";
import { ledger } from "./ledger";
import { lilac } from "./lilac";
import { lume } from "./lume";
import { madder } from "./madder";
import { nix } from "./nix";
import { noir } from "./noir";
import { office } from "./office";
import { pixel } from "./pixel";
import { plaster } from "./plaster";
import { postal } from "./postal";
import { press } from "./press";
import { rave } from "./rave";
import { riso } from "./riso";
import { rivet } from "./rivet";
import { roast } from "./roast";
import { rovers } from "./rovers";
import { sap } from "./sap";
import { scrap } from "./scrap";
import { second } from "./second";
import { shelf } from "./shelf";
import { signal } from "./signal";
import { smile } from "./smile";
import { stacks } from "./stacks";
import { sumi } from "./sumi";
import { surf } from "./surf";
import { tide } from "./tide";
import { trail } from "./trail";
import { vellum } from "./vellum";
import { volt } from "./volt";
import { wax } from "./wax";

// Adding a look: copy a look file, change it, add it here, and add its name to lookNames in page.
export const looks: Record<LookName, Look> = {
    madder,
    dusk,
    sumi,
    sap,
    indigo,
    bake,
    noir,
    signal,
    surf,
    roast,
    lilac,
    fern,
    atelier,
    vellum,
    plaster,
    porcelain,
    lagoon,
    tide,
    brine,
    lume,
    harvest,
    wax,
    shelf,
    press,
    postal,
    counsel,
    calm,
    ledger,
    estate,
    office,
    bloom,
    cutout,
    riso,
    nix,
    comet,
    second,
    ink,
    rave,
    volt,
    pixel,
    conf,
    rivet,
    trail,
    smile,
    keys,
    crumb,
    biscuit,
    glass,
    rovers,
    stacks,
    scrap,
};
