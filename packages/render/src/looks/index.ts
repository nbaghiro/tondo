import type { LookName } from "@tondo/page";
import type { Look } from "../define-look";
import { dusk } from "./dusk";
import { madder } from "./madder";

// Adding a look: copy a look file, change it, add it here, and add its name to lookNames in page.
export const looks: Record<LookName, Look> = { madder, dusk };
