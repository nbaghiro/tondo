import { PLANS, PRICES } from "@tondo/page";
import type { PaidPlan, Period } from "@tondo/page";
import { createSignal, For } from "solid-js";
import "../styles/plan-choice.css";

const NAMES: Readonly<Record<PaidPlan, string>> = { starter: "Starter", pro: "Pro" };

const covers = (plan: PaidPlan) => {
    const { live, credits, photos } = PLANS[plan];
    const pages = `${String(live)} live ${live === 1 ? "page" : "pages"}`;
    const rest = `${String(credits)} Help me credits a month and ${photos.toLocaleString("en")} photos`;
    return plan === "pro" ? `${pages}, ${rest}. Team features are included.` : `${pages}, ${rest}.`;
};

/** Starter and Pro, paid monthly or yearly. Pressing a plan goes to Stripe to confirm and pay. */
export function PlanChoice(props: {
    offer: "any" | "pro";
    onChoose: (plan: PaidPlan, period: Period) => void;
}) {
    const [period, setPeriod] = createSignal<Period>("month");
    const plans = (): PaidPlan[] => (props.offer === "pro" ? ["pro"] : ["starter", "pro"]);
    return (
        <div class="plan-choice" data-plan-choice>
            <div class="plan-period" role="group" aria-label="How often to pay">
                <For
                    each={
                        [
                            ["month", "Monthly"],
                            ["year", "Yearly"],
                        ] as const
                    }
                >
                    {([id, label]) => (
                        <button
                            type="button"
                            data-period={id}
                            aria-pressed={period() === id}
                            onClick={() => setPeriod(id)}
                        >
                            {label}
                        </button>
                    )}
                </For>
            </div>
            <For each={plans()}>
                {(plan) => (
                    <button
                        type="button"
                        class="plan-option"
                        data-plan={plan}
                        onClick={() => {
                            props.onChoose(plan, period());
                        }}
                    >
                        <span class="plan-head">
                            <b>{NAMES[plan]}</b>
                            <span>
                                ${PRICES[plan][period()]} a {period()}
                            </span>
                        </span>
                        <small>
                            {covers(plan)}
                            {period() === "year" ? " Two months free." : ""}
                        </small>
                    </button>
                )}
            </For>
        </div>
    );
}
