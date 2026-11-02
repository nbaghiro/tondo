import type { MeResponse } from "@tondo/contract";

export const longDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" });

/** The plan someone has now. One that has ended reads as Free. */
export const planName = ({ plan, limits }: Pick<MeResponse, "plan" | "limits">): string =>
    limits.live === 0 ? "Free" : plan === "starter" ? "Starter" : "Pro";
