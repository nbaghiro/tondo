import type { MeResponse } from "@tondo/contract";
import { createSignal } from "solid-js";

export type PlanState = Pick<MeResponse, "plan" | "limits" | "endsAt" | "designUntil" | "billing">;

const [plan, setPlan] = createSignal<PlanState | null>(null);

/** Set when the account loads, so every panel reads the same answer without passing it down. */
export { plan, setPlan };
