import type { MeResponse } from "@tondo/contract";
import { createSignal } from "solid-js";
import { loadAccount } from "../lib/account";

export type PlanState = Pick<MeResponse, "plan" | "limits" | "endsAt" | "billing">;

const [plan, setPlan] = createSignal<PlanState | null>(null);

/** Set when the account loads, so every panel reads the same answer without passing it down. */
export { plan, setPlan };

/** Asks the server again, after paying or when it answers differently from what's shown. */
export async function refreshPlan(): Promise<void> {
    const account = await loadAccount();
    if (account) setPlan(account);
}
