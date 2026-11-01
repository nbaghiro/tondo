import type { MeResponse } from "@tondo/contract";
import { createSignal } from "solid-js";
import { loadAccount } from "../lib/account";

export type PlanState = Pick<MeResponse, "plan" | "limits" | "endsAt" | "designUntil" | "billing">;

const [plan, setPlan] = createSignal<PlanState | null>(null);

/** Set when the account loads, so every panel reads the same answer without passing it down. */
export { plan, setPlan };

/** Whether to mention that this needs Pro. Nothing is mentioned once it's covered, or while plans are off. */
export const needsPro = (what: "design" | "business"): boolean => {
    const current = plan();
    return Boolean(current?.billing && !current.limits[what]);
};

/** Asks the server again, after paying or when it answers differently from what's shown. */
export async function refreshPlan(): Promise<void> {
    const account = await loadAccount();
    if (account) setPlan(account);
}
