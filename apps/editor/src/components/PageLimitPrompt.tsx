import { MOST_PACKS, PACK_PAGES, PRICES } from "@tondo/page";
import type { PaidPlan, Period } from "@tondo/page";
import { createSignal, Match, onMount, Show, Switch } from "solid-js";
import type { Account } from "../lib/account";
import { changePacks, startCheckout } from "../lib/api";
import { PlanChoice } from "./PlanChoice";

function NeedsPlan(props: { onClose: () => void }) {
    const [problem, setProblem] = createSignal("");
    const choose = async (plan: PaidPlan, period: Period) => {
        setProblem("");
        const url = await startCheckout({ plan, period, from: "account" });
        if (url) location.assign(url);
        else setProblem("We couldn't open the payment page. Please try again.");
    };
    return (
        <div data-page-limit="plan">
            <h2>Move to Pro to add a page</h2>
            <p>
                Your plan has room for one page. Pro has room for {PACK_PAGES}, each with its own
                address.
            </p>
            <Show when={problem()}>
                <p class="bad-note" role="alert">
                    {problem()}
                </p>
            </Show>
            <PlanChoice
                offer="pro"
                onChoose={(plan, period) => {
                    choose(plan, period).catch(() => undefined);
                }}
            />
            <p class="good-note">
                You'll confirm on Stripe's page, and you can go back from there without paying.
            </p>
            <div class="acts">
                <button
                    class="b"
                    type="button"
                    data-keep-editing
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Not now
                </button>
            </div>
        </div>
    );
}

function AddMore(props: { packs: number; onClose: () => void }) {
    const [problem, setProblem] = createSignal("");
    const add = async () => {
        setProblem("");
        const url = await changePacks(props.packs + 1);
        if (url) location.assign(url);
        else setProblem("We couldn't open the payment page. Please try again.");
    };
    return (
        <div data-page-limit="more">
            <h2>Add {PACK_PAGES} more pages</h2>
            <p>
                You're using all {props.packs * PACK_PAGES} pages. {PACK_PAGES} more costs $
                {PRICES.pro.month} a month, or ${PRICES.pro.year} a year if you pay yearly. You'll
                confirm the change on Stripe's page.
            </p>
            <Show when={problem()}>
                <p class="bad-note" role="alert">
                    {problem()}
                </p>
            </Show>
            <div class="acts">
                <button
                    class="b p"
                    type="button"
                    data-add-pages
                    onClick={() => {
                        add().catch(() => undefined);
                    }}
                >
                    Add {PACK_PAGES} more pages
                </button>
                <button
                    class="b"
                    type="button"
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Not now
                </button>
            </div>
        </div>
    );
}

function AllUsed(props: { count: number; onClose: () => void }) {
    return (
        <div data-page-limit="all">
            <h2>You're using all your pages</h2>
            <p>You're using all {props.count} pages. Delete one to add another.</p>
            <div class="acts">
                <button
                    class="b"
                    type="button"
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}

/** Says why another page can't be added on this plan. */
export function PageLimitPrompt(props: { account: Account; onClose: () => void }) {
    const [dialog, setDialog] = createSignal<HTMLDialogElement>();
    onMount(() => {
        dialog()?.showModal();
    });
    const close = () => {
        dialog()?.close();
    };
    const limits = () => props.account.limits;
    const packs = () => limits().pages / PACK_PAGES;
    return (
        <dialog
            class="page-limit"
            aria-label="New page"
            ref={setDialog}
            onClose={() => {
                props.onClose();
            }}
        >
            <Switch fallback={<AllUsed count={limits().pages} onClose={close} />}>
                <Match when={props.account.billing && !limits().team}>
                    <NeedsPlan onClose={close} />
                </Match>
                <Match when={props.account.billing && packs() < MOST_PACKS}>
                    <AddMore packs={packs()} onClose={close} />
                </Match>
            </Switch>
        </dialog>
    );
}
