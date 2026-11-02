import { PRICES } from "@tondo/page";
import type { PaidPlan, Period } from "@tondo/page";
import Stripe from "stripe";

export interface SubscriptionView {
    id: string;
    itemId: string | null;
    status: string;
    /** Seconds since 1970, when it ended. */
    endedAt: number | null;
    lookupKey: string | null;
    period: Period | null;
    /** Seconds since 1970, when the paid period ends. */
    periodEnd: number | null;
    cancelling: boolean;
}

export type BillingEvent =
    | { kind: "sync"; customer: () => Promise<string | null> }
    | { kind: "review"; type: string; id: string }
    | { kind: "ignore" };

/** Everything Tondo asks of Stripe, so the routes can be tested without it. */
export interface Payments {
    createCustomer: (userId: string, email: string) => Promise<string>;
    checkoutUrl: (input: {
        customer: string;
        plan: PaidPlan;
        period: Period;
        successUrl: string;
        cancelUrl: string;
    }) => Promise<string>;
    /** Stripe's page for confirming a change to this subscription, which it charges for itself. */
    changeUrl: (input: {
        customer: string;
        subscription: string;
        item: string;
        plan: PaidPlan;
        period: Period;
        returnUrl: string;
    }) => Promise<string>;
    portalUrl: (customer: string, returnUrl: string) => Promise<string>;
    subscriptions: (customer: string) => Promise<SubscriptionView[]>;
    /** Permanently deletes the customer, which also cancels any subscription straight away. */
    deleteCustomer: (customer: string) => Promise<void>;
    /** Throws if the signature doesn't check out. */
    readEvent: (body: string, signature: string) => BillingEvent;
    /** Throws if the Prices in Stripe don't match what the site says. */
    checkPrices: () => Promise<void>;
}

const SYNC = new Set([
    "v1.checkout.session.completed",
    "v1.checkout.session.async_payment_succeeded",
    "v1.checkout.session.async_payment_failed",
    "v1.customer.subscription.created",
    "v1.customer.subscription.updated",
    "v1.customer.subscription.deleted",
    "v1.invoice.paid",
    "v1.invoice.payment_failed",
]);
const REVIEW = new Set([
    "v1.charge.dispute.created",
    "v1.charge.refunded",
    "v1.radar.early_fraud_warning.created",
]);

const keyOf = (plan: PaidPlan, period: Period) => `${plan}_${period}`;

const idOf = (value: unknown): string | null => {
    if (typeof value === "string") return value;
    const id = (value as { id?: unknown } | null)?.id;
    return typeof id === "string" ? id : null;
};

export interface StripeEnv {
    key: string;
    webhookSecret: string;
    tax: boolean;
    /** A stand-in's address, in tests. */
    apiBase?: string | undefined;
}

export function createPayments({ key, webhookSecret, tax, apiBase }: StripeEnv): Payments {
    const base = apiBase ? new URL(apiBase) : null;
    const client = new Stripe(key, {
        ...(base
            ? {
                  host: base.hostname,
                  port: base.port,
                  protocol: base.protocol === "http:" ? ("http" as const) : ("https" as const),
              }
            : {}),
    });
    const priceFor = async (plan: PaidPlan, period: Period) => {
        const key = keyOf(plan, period);
        const { data } = await client.prices.list({ lookup_keys: [key], active: true });
        const price = data[0];
        if (!price) throw new Error(`Stripe has no active Price with the key ${key}.`);
        return price;
    };
    return {
        createCustomer: async (userId, email) => {
            const customer = await client.customers.create(
                { email, metadata: { tondo_user: userId } },
                { idempotencyKey: `customer-${userId}` },
            );
            return customer.id;
        },
        checkoutUrl: async ({ customer, plan, period, successUrl, cancelUrl }) => {
            const price = await priceFor(plan, period);
            const session = await client.checkout.sessions.create({
                mode: "subscription",
                customer,
                line_items: [{ price: price.id, quantity: 1 }],
                success_url: successUrl,
                cancel_url: cancelUrl,
                integration_identifier: "tondo_plans_qhzmtvra",
                consent_collection: { terms_of_service: "required" },
                ...(tax
                    ? {
                          automatic_tax: { enabled: true },
                          customer_update: { address: "auto", name: "auto" },
                          tax_id_collection: { enabled: true },
                      }
                    : {}),
            });
            if (!session.url) throw new Error("Stripe sent no payment page.");
            return session.url;
        },
        changeUrl: async ({ customer, subscription, item, plan, period, returnUrl }) => {
            const price = await priceFor(plan, period);
            const session = await client.billingPortal.sessions.create({
                customer,
                return_url: returnUrl,
                flow_data: {
                    type: "subscription_update_confirm",
                    subscription_update_confirm: {
                        subscription,
                        items: [{ id: item, price: price.id, quantity: 1 }],
                    },
                    after_completion: { type: "redirect", redirect: { return_url: returnUrl } },
                },
            });
            return session.url;
        },
        portalUrl: async (customer, returnUrl) => {
            const session = await client.billingPortal.sessions.create({
                customer,
                return_url: returnUrl,
            });
            return session.url;
        },
        subscriptions: async (customer) => {
            const { data } = await client.subscriptions.list({
                customer,
                status: "all",
                limit: 10,
            });
            return data.map((sub) => {
                const item = sub.items.data[0];
                const interval = item?.price.recurring?.interval;
                return {
                    id: sub.id,
                    itemId: item?.id ?? null,
                    status: sub.status,
                    endedAt: sub.ended_at ?? null,
                    lookupKey: item?.price.lookup_key ?? null,
                    period: interval === "month" ? "month" : interval === "year" ? "year" : null,
                    periodEnd: item?.current_period_end ?? null,
                    cancelling: sub.cancel_at_period_end,
                };
            });
        },
        deleteCustomer: async (customer) => {
            await client.customers.del(customer).catch((error: unknown) => {
                // Already gone is what was asked for.
                if ((error as { code?: unknown }).code !== "resource_missing") throw error;
            });
        },
        readEvent: (body, signature) => {
            const event = client.parseEventNotification(body, signature, webhookSecret);
            if (REVIEW.has(event.type)) return { kind: "review", type: event.type, id: event.id };
            if (!SYNC.has(event.type)) return { kind: "ignore" };
            return {
                kind: "sync",
                customer: async () => {
                    if (!("fetchRelatedObject" in event)) return null;
                    const fetched: object = await event.fetchRelatedObject();
                    return "customer" in fetched ? idOf(fetched.customer) : null;
                },
            };
        },
        checkPrices: async () => {
            for (const plan of ["starter", "pro"] as const) {
                for (const period of ["month", "year"] as const) {
                    const price = await priceFor(plan, period);
                    if (price.unit_amount !== PRICES[plan][period] * 100) {
                        throw new Error(`The Price ${keyOf(plan, period)} doesn't match the site.`);
                    }
                }
            }
        },
    };
}

/** Reads the environment. Null means billing can't run here. */
export function paymentsFromEnv(env: NodeJS.ProcessEnv): Payments | null {
    const key = env["STRIPE_KEY"];
    const webhookSecret = env["STRIPE_WEBHOOK_SECRET"];
    if (!key || !webhookSecret) return null;
    return createPayments({
        key,
        webhookSecret,
        tax: env["STRIPE_TAX"] === "true",
        apiBase: env["STRIPE_API_BASE"],
    });
}
