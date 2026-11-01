import type { LookName } from "@tondo/page";
import { looks, lookVars } from "@tondo/render";

/** A look's own colours, type and shapes, as a style attribute. */
export const lookStyle = (name: LookName): string =>
    Object.entries(lookVars(name, looks[name]))
        .filter(([key]) => key.startsWith("--"))
        .map(([key, value]) => `${key}:${value}`)
        .join(";");
