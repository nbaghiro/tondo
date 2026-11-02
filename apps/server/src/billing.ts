import { checkoutRequest, routes } from "@tondo/contract";
import type { BillingResponse, BillingUrlResponse, ErrorResponse } from "@tondo/contract";
import type { AccountStore } from "@tondo/db";
import type { PaidPlan } from "@tondo/page";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { CurrentPerson } from "./auth";
import type { BillingEvent, Payments, SubscriptionView } from "./stripe";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";

const PAID = new Set(["active", "trialing", "past_due"]);
const STOPPED = new Set(["unpaid", "paused"]);

const planOf = (sub: SubscriptionView): PaidPlan => {
    const name = sub.lookupKey?.split("_")[0];
    if (name === "starter" || name === "pro") return name;
    // Nobody who paid should end up on Free because of a mistake in the Dashboard.
    process.stderr.write(`A subscription has an unknown price key: ${String(sub.lookupKey)}\n`);
    return "pro";
};

const latest = (list: readonly SubscriptionView[]) =>
    [...list].sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];

/**
 * Copies what Stripe says now. Every event ends up here, so repeats and events out of order do no
 * harm. Returns whose plan it changed, if anyone has this customer.
 */
export async function syncPlan(
    payments: Payments,
    store: Pick<AccountStore, "setPlan">,
    customer: string,
    now = new Date(),
): Promise<string | null> {
    const list = await payments.subscriptions(customer);
    const paid = list.filter((sub) => PAID.has(sub.status));
    if (paid.length > 1) process.stderr.write(`${customer} has more than one paid subscription.\n`);
    const first = paid[0];
    if (first) return store.setPlan(customer, { plan: planOf(first), endsAt: null });
    const ended = latest(list.filter((sub) => sub.endedAt !== null));
    if (ended) {
        return store.setPlan(customer, {
            plan: planOf(ended),
            endsAt: new Date((ended.endedAt ?? 0) * 1000),
        });
    }
    const stopped = list.find((sub) => STOPPED.has(sub.status));
    if (stopped) {
        process.stderr.write(`${customer} has a subscription that is ${stopped.status}.\n`);
        return store.setPlan(customer, { plan: planOf(stopped), endsAt: now, ifEmpty: true });
    }
    return null;
}

export function mountBilling(
    app: Hono,
    {
        payments,
        store,
        currentPerson,
        appUrl,
        scale,
        onPlanChange,
    }: {
        payments: Payments;
        store: AccountStore;
        currentPerson: CurrentPerson;
        /** Where the editor is, given this request. */
        appUrl: (c: Context) => string;
        scale: Scale;
        onPlanChange: (userId: string) => Promise<void>;
    },
): void {
    const fail = (c: Context, status: 400 | 401 | 404 | 409 | 415 | 429 | 503, error: string) =>
        c.json<ErrorResponse>({ error }, status);
    const small = bodyLimit({ maxSize: 4096 });
    const isJson = (c: Context) => c.req.header("content-type")?.startsWith("application/json");
    const allow = createLimiter(scale(30), 60_000);
    const UNAVAILABLE = "We couldn't reach our payment provider. Please try again.";

    const sync = async (customer: string) => {
        const userId = await syncPlan(payments, store, customer);
        if (userId) await onPlanChange(userId);
    };
    // Sent as JSON, so a form on another site can't start one of these.
    const allowed = async (c: Context) => {
        if (!isJson(c)) return { refused: fail(c, 415, "Send this as JSON.") };
        const person = await currentPerson(c);
        if (!person) return { refused: fail(c, 401, "You're not logged in.") };
        if (!allow(person.id)) {
            return { refused: fail(c, 429, "Too many tries. Wait a little and try again.") };
        }
        return { person };
    };

    app.get(routes.billing, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const customer = await store.findStripeId(person.id);
        const none: BillingResponse = {
            period: null,
            until: null,
            cancelling: false,
            failing: false,
        };
        if (!customer) return c.json<BillingResponse>(none);
        const list = await payments.subscriptions(customer).catch(() => null);
        if (!list) return fail(c, 503, UNAVAILABLE);
        const sub = list.find((other) => PAID.has(other.status));
        if (!sub) return c.json<BillingResponse>(none);
        return c.json<BillingResponse>({
            period: sub.period,
            until: sub.periodEnd ? new Date(sub.periodEnd * 1000).toISOString() : null,
            cancelling: sub.cancelling,
            failing: sub.status === "past_due",
        });
    });

    app.post(routes.billingCheckout, small, async (c) => {
        const { person, refused } = await allowed(c);
        if (!person) return refused;
        const parsed = checkoutRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) return fail(c, 400, "Choose a plan, and monthly or yearly.");
        // Paying would end a free period someone was given, so that waits until it's over.
        const current = await store.findPlan(person.id);
        if (current.plan !== "free" && current.endsAt && current.endsAt > new Date()) {
            return fail(
                c,
                409,
                "You have a plan for free at the moment. There's nothing to pay yet.",
            );
        }
        try {
            const customer =
                (await store.findStripeId(person.id)) ??
                (await store.setStripeId(
                    person.id,
                    await payments.createCustomer(person.id, person.email),
                ));
            if (!customer) return fail(c, 404, "Choose your address first.");
            const { plan, period, from, page } = parsed.data;
            const base = appUrl(c);
            const onPage = page ? `&page=${page}` : "";
            const successUrl = `${base}/${from}?paid=1${onPage}`;
            const list = await payments.subscriptions(customer);
            const current = list.find((sub) => PAID.has(sub.status));
            if (current) {
                if (plan !== "pro" || planOf(current) !== "starter" || !current.itemId) {
                    return fail(
                        c,
                        409,
                        "You already have a plan. Manage it from your Account page.",
                    );
                }
                const url = await payments.changeUrl({
                    customer,
                    subscription: current.id,
                    item: current.itemId,
                    plan,
                    period,
                    returnUrl: successUrl,
                });
                return c.json<BillingUrlResponse>({ url });
            }
            const url = await payments.checkoutUrl({
                customer,
                plan,
                period,
                successUrl,
                cancelUrl:
                    from === "edit" ? `${base}/edit?panel=publish${onPage}` : `${base}/account`,
            });
            return c.json<BillingUrlResponse>({ url });
        } catch (error) {
            process.stderr.write(`Checkout failed: ${String(error)}\n`);
            return fail(c, 503, UNAVAILABLE);
        }
    });

    app.post(routes.billingPortal, small, async (c) => {
        const { person, refused } = await allowed(c);
        if (!person) return refused;
        const customer = await store.findStripeId(person.id);
        if (!customer) return fail(c, 404, "You don't have a plan to manage.");
        const url = await payments
            .portalUrl(customer, `${appUrl(c)}/account?billing=1`)
            .catch(() => null);
        if (!url) return fail(c, 503, UNAVAILABLE);
        return c.json<BillingUrlResponse>({ url });
    });

    // A late webhook can't strand someone who has just paid, because coming back runs this too.
    app.post(routes.billingSync, small, async (c) => {
        const { person, refused } = await allowed(c);
        if (!person) return refused;
        const customer = await store.findStripeId(person.id);
        if (customer) {
            const done = await sync(customer).then(
                () => true,
                () => false,
            );
            if (!done) return fail(c, 503, UNAVAILABLE);
        }
        return c.body(null, 204);
    });

    // Read as text, because any parsing would break the signature.
    app.post(routes.stripeWebhook, async (c) => {
        const body = await c.req.text();
        let event: BillingEvent;
        try {
            event = payments.readEvent(body, c.req.header("stripe-signature") ?? "");
        } catch {
            return c.text("Bad signature.", 400);
        }
        if (event.kind === "review") {
            process.stderr.write(`Review in the Stripe Dashboard: ${event.type} ${event.id}\n`);
        }
        if (event.kind !== "sync") return c.body(null, 200);
        try {
            const customer = await event.customer();
            if (customer) await sync(customer);
        } catch (error) {
            // A deleted account's late events are expected, and retrying wouldn't help.
            if ((error as { code?: unknown }).code === "resource_missing") return c.body(null, 200);
            process.stderr.write(`Couldn't sync a plan: ${String(error)}\n`);
            return c.text("Try again.", 500);
        }
        return c.body(null, 200);
    });
}
