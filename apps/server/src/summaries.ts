import type { PageSummary as ContractSummary } from "@tondo/contract";
import type { PageSummary } from "@tondo/db";
import { isPageOnline } from "@tondo/page";
import { limitsOf } from "./limits";

/** A page's line for the browser, which is told the answer and not how it was reached. */
export function summaryOut({ standing, ...summary }: PageSummary): ContractSummary {
    return { ...summary, offline: summary.live && !isPageOnline(standing, limitsOf) };
}
