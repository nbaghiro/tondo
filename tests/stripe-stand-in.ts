// A stand-in for the parts of Stripe's API Tondo uses, on the Neon stand-in's port. Its events are
// signed for real, so signature checking runs in tests with no test mode in the app.
import { createHmac, randomUUID } from "node:crypto";
import type { ServerResponse } from "node:http";
import { PORTS } from "../scripts/ports";
import { STRIPE_TEST_SECRET } from "./test-code";

interface Subscription {
    id: string;
    object: "subscription";
    customer: string;
    status: string;
    ended_at: number | null;
    cancel_at_period_end: boolean;
    items: { object: "list"; data: unknown[] };
}

const PRICES = [
    { id: "price_month", key: "pro_month", amount: 600, interval: "month" },
    { id: "price_year", key: "pro_year", amount: 6000, interval: "year" },
];
const priceObject = (price: (typeof PRICES)[number]) => ({
    id: price.id,
    object: "price",
    active: true,
    lookup_key: price.key,
    unit_amount: price.amount,
    recurring: { interval: price.interval },
});

const customers = new Set<string>();
const byKey = new Map<string, string>();
const subscriptions = new Map<string, Subscription>();
const sessions = new Map<
    string,
    { customer: string; price: string; success: string; cancel: string }
>();
const SITE = `http://127.0.0.1:${String(PORTS.testNeon)}`;
const WEBHOOK = `http://127.0.0.1:${String(PORTS.testServer)}/api/stripe/webhook`;

const now = () => Math.floor(Date.now() / 1000);
const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json", "request-id": "req_stand_in" });
    res.end(JSON.stringify(body));
};
const missing = (res: ServerResponse) => {
    json(res, 404, { error: { type: "invalid_request_error", code: "resource_missing" } });
};

export async function sendEvent(type: string, relatedId: string, relatedType: string, url: string) {
    const body = JSON.stringify({
        id: `evt_${randomUUID()}`,
        object: "v2.core.event",
        type,
        created: new Date().toISOString(),
        livemode: false,
        related_object: { id: relatedId, type: relatedType, url },
    });
    const t = now();
    const signature = createHmac("sha256", STRIPE_TEST_SECRET)
        .update(`${String(t)}.${body}`)
        .digest("hex");
    await fetch(WEBHOOK, {
        method: "POST",
        headers: { "stripe-signature": `t=${String(t)},v1=${signature}` },
        body,
    }).catch(() => undefined);
}

const subscriptionEvent = (type: string, sub: Subscription) =>
    sendEvent(type, sub.id, "subscription", `/v1/subscriptions/${sub.id}`);

function subsOf(customer: string): Subscription[] {
    return [...subscriptions.values()].filter((sub) => sub.customer === customer);
}

function endAll(customer: string): Subscription[] {
    const ended = subsOf(customer).filter((sub) => sub.ended_at === null);
    for (const sub of ended) {
        sub.status = "canceled";
        sub.ended_at = now();
    }
    return ended;
}

const page = (body: string) =>
    `<!doctype html><meta charset="utf-8"><title>Stand-in</title>${body}`;

/** Answers if this path is Stripe's. */
export function stripeStandIn(
    method: string,
    url: string,
    headers: Record<string, string | string[] | undefined>,
    raw: string,
    res: ServerResponse,
): boolean {
    const { pathname, searchParams } = new URL(url, SITE);
    const form = new URLSearchParams(raw);
    if (pathname.startsWith("/pay/")) {
        const [, , id, action] = pathname.split("/");
        if (id === "portal") {
            res.writeHead(200, { "content-type": "text/html" });
            res.end(page(`<a id="back" href="${searchParams.get("return") ?? ""}">Back</a>`));
            return true;
        }
        const session = sessions.get(id ?? "");
        if (!session) {
            res.writeHead(404).end();
            return true;
        }
        if (action === "cancel") {
            res.writeHead(302, { location: session.cancel }).end();
            return true;
        }
        if (action === "done") {
            const price = PRICES.find((other) => other.id === session.price) ?? PRICES[0];
            const sub: Subscription = {
                id: `sub_${randomUUID()}`,
                object: "subscription",
                customer: session.customer,
                status: "active",
                ended_at: null,
                cancel_at_period_end: false,
                items: {
                    object: "list",
                    data: [
                        {
                            id: "si_1",
                            price: price ? priceObject(price) : null,
                            current_period_end: now() + 30 * 86_400,
                        },
                    ],
                },
            };
            subscriptions.set(sub.id, sub);
            // With ?quiet, no event is sent, to show that coming back is enough by itself.
            const finish = () => res.writeHead(302, { location: session.success }).end();
            if (searchParams.has("quiet")) finish();
            else {
                subscriptionEvent("v1.customer.subscription.created", sub).then(finish, finish);
            }
            return true;
        }
        res.writeHead(200, { "content-type": "text/html" });
        res.end(
            page(
                `<h1>Pay</h1><a id="pay" href="/pay/${id ?? ""}/done">Pay</a> <a id="pay-quiet" href="/pay/${id ?? ""}/done?quiet=1">Pay with no event</a> <a id="cancel" href="/pay/${id ?? ""}/cancel">Cancel</a>`,
            ),
        );
        return true;
    }
    if (pathname.startsWith("/stripe-control/")) {
        const customer = searchParams.get("customer") ?? "";
        const action = pathname.split("/")[2];
        const subs = subsOf(customer);
        const done = () => {
            json(res, 200, { active: subs.filter((sub) => sub.ended_at === null).length });
        };
        const emit = (type: string) =>
            Promise.all(subs.map((sub) => subscriptionEvent(type, sub))).then(done, done);
        if (action === "end") {
            endAll(customer);
            emit("v1.customer.subscription.deleted").catch(() => undefined);
        } else if (action === "fail") {
            for (const sub of subs) sub.status = "past_due";
            emit("v1.customer.subscription.updated").catch(() => undefined);
        } else if (action === "twice") {
            emit("v1.customer.subscription.updated")
                .then(() => emit("v1.customer.subscription.updated"))
                .catch(() => undefined);
        } else {
            done();
        }
        return true;
    }
    if (!pathname.startsWith("/v1/") && !pathname.startsWith("/v2/")) return false;

    const parts = pathname.split("/").slice(2);
    if (parts[0] === "customers") {
        if (method === "POST") {
            const key = String(headers["idempotency-key"] ?? randomUUID());
            const id = byKey.get(key) ?? `cus_${randomUUID()}`;
            byKey.set(key, id);
            customers.add(id);
            json(res, 200, { id, object: "customer" });
            return true;
        }
        if (method === "DELETE") {
            const id = parts[1] ?? "";
            if (!customers.delete(id)) {
                missing(res);
                return true;
            }
            endAll(id);
            json(res, 200, { id, object: "customer", deleted: true });
            return true;
        }
    }
    if (parts[0] === "prices") {
        const key = searchParams.get("lookup_keys[0]");
        json(res, 200, {
            object: "list",
            has_more: false,
            data: PRICES.filter((price) => price.key === key).map(priceObject),
        });
        return true;
    }
    if (parts[0] === "checkout" && parts[1] === "sessions" && method === "POST") {
        const id = `cs_${randomUUID()}`;
        sessions.set(id, {
            customer: form.get("customer") ?? "",
            price: form.get("line_items[0][price]") ?? "",
            success: form.get("success_url") ?? "",
            cancel: form.get("cancel_url") ?? "",
        });
        json(res, 200, { id, object: "checkout.session", url: `${SITE}/pay/${id}` });
        return true;
    }
    if (parts[0] === "billing_portal") {
        const back = encodeURIComponent(form.get("return_url") ?? "");
        json(res, 200, {
            id: "bps_1",
            object: "billing_portal.session",
            url: `${SITE}/pay/portal?return=${back}`,
        });
        return true;
    }
    if (parts[0] === "subscriptions") {
        if (parts[1]) {
            const found = subscriptions.get(parts[1]);
            if (found) json(res, 200, found);
            else missing(res);
            return true;
        }
        json(res, 200, {
            object: "list",
            has_more: false,
            data: subsOf(searchParams.get("customer") ?? ""),
        });
        return true;
    }
    missing(res);
    return true;
}
