import { describe, expect, it } from "vitest";
import { syncPlan } from "./billing";
import { createFakeStore } from "./fake-store";
import type { Payments, SubscriptionView } from "./stripe";
import { Hono } from "hono";
import { mountBilling } from "./billing";

const sub = (over: Partial<SubscriptionView>): SubscriptionView => ({
    id: "sub_1",
    itemId: "si_1",
    status: "active",
    endedAt: null,
    lookupKey: "pro_month",
    period: "month",
    periodEnd: 2_000_000_000,
    cancelling: false,
    quantity: 1,
    trialEnd: null,
    ...over,
});

function setup(list: SubscriptionView[] = []) {
    const store = createFakeStore();
    store.customers.set("june", "cus_1");
    let current = list;
    const calls: string[] = [];
    let readEvent: Payments["readEvent"] = () => ({
        kind: "sync",
        customer: () => Promise.resolve("cus_1"),
    });
    const payments: Payments = {
        createCustomer: () => Promise.resolve("cus_new"),
        checkoutUrl: (input) => {
            calls.push(`checkout ${input.plan} ${input.period} ${input.successUrl}`);
            calls.push(`trial ${String(input.trial)}`);
            return Promise.resolve("https://pay.example/1");
        },
        changeUrl: (input) => {
            calls.push(`change ${input.plan} ${input.period} ${String(input.quantity)}`);
            return Promise.resolve("https://pay.example/change");
        },
        portalUrl: () => Promise.resolve("https://pay.example/portal"),
        subscriptions: () => Promise.resolve(current),
        deleteCustomer: () => Promise.resolve(),
        readEvent: (body, signature) => readEvent(body, signature),
        checkPrices: () => Promise.resolve(),
    };
    const dropped: string[] = [];
    const app = new Hono();
    mountBilling(app, {
        payments,
        store,
        currentPerson: (c) =>
            Promise.resolve(
                c.req.header("x-person")
                    ? { id: c.req.header("x-person") ?? "", email: "j@example.com", name: "June" }
                    : null,
            ),
        appUrl: () => "https://tondo.page/app",
        scale: (max) => max,
        onPlanChange: (userId) => {
            dropped.push(userId);
            return Promise.resolve();
        },
    });
    const post = (path: string, body: unknown, person = "june") =>
        app.request(path, {
            method: "POST",
            headers: { "content-type": "application/json", "x-person": person },
            body: JSON.stringify(body),
        });
    return {
        store,
        payments,
        app,
        post,
        calls,
        dropped,
        setList: (next: SubscriptionView[]) => {
            current = next;
        },
        setRead: (next: Payments["readEvent"]) => {
            readEvent = next;
        },
    };
}

describe("copying a plan from Stripe", () => {
    const stateAfter = async (list: SubscriptionView[]) => {
        const { store, payments } = setup(list);
        await syncPlan(payments, store, "cus_1");
        return store.plans.get("june");
    };

    it.each(["active", "trialing", "past_due"])("treats %s as paid", async (status) => {
        expect(await stateAfter([sub({ status })])).toEqual({
            plan: "pro",
            endsAt: null,
            packs: 1,
        });
    });

    it("uses Stripe's own end date, so repeats can't move it", async () => {
        const ended = sub({ status: "canceled", endedAt: 1_900_000_000 });
        expect(await stateAfter([ended])).toEqual({
            plan: "pro",
            endsAt: new Date(1_900_000_000_000),
        });
    });

    it("changes nothing for an unfinished checkout", async () => {
        expect(await stateAfter([sub({ status: "incomplete" })])).toBeUndefined();
    });

    it("reads Starter and Pro from the price key, monthly or yearly", async () => {
        for (const [lookupKey, plan] of [
            ["starter_month", "starter"],
            ["starter_year", "starter"],
            ["pro_month", "pro"],
            ["pro_year", "pro"],
        ] as const) {
            expect((await stateAfter([sub({ lookupKey })]))?.plan).toBe(plan);
        }
    });

    it("treats an unknown price as Pro", async () => {
        expect((await stateAfter([sub({ lookupKey: "mistake" })]))?.plan).toBe("pro");
    });

    it("gives the same row for repeated and reversed events", async () => {
        const { store, payments, setList } = setup([sub({})]);
        await syncPlan(payments, store, "cus_1");
        await syncPlan(payments, store, "cus_1");
        setList([sub({ status: "canceled", endedAt: 1_900_000_000 })]);
        await syncPlan(payments, store, "cus_1");
        const once = store.plans.get("june");
        await syncPlan(payments, store, "cus_1");
        expect(store.plans.get("june")).toEqual(once);
    });

    it("keeps an end date already stored when a subscription is stopped", async () => {
        const { store, payments } = setup([sub({ status: "unpaid" })]);
        const earlier = new Date(1_800_000_000_000);
        store.plans.set("june", { plan: "pro", endsAt: earlier });
        await syncPlan(payments, store, "cus_1");
        expect(store.plans.get("june")?.endsAt).toEqual(earlier);
    });
});

describe("packs and the trial", () => {
    it("copies how many packs from the subscription", async () => {
        const { store, payments } = setup([sub({ status: "trialing", quantity: 3 })]);
        await syncPlan(payments, store, "cus_1");
        expect(store.plans.get("june")).toMatchObject({ plan: "pro", packs: 3, endsAt: null });
    });

    it("gives a trial on the first subscription only", async () => {
        const body = { plan: "pro", period: "month", from: "edit" };
        const first = setup();
        await first.post("/api/v1/me/billing/checkout", body);
        expect(first.calls).toContain("trial true");
        const again = setup([sub({ status: "canceled", endedAt: 1_000 })]);
        await again.post("/api/v1/me/billing/checkout", body);
        expect(again.calls).toContain("trial false");
    });

    it("changes how many packs through Stripe's confirm page, on Pro only", async () => {
        const pro = setup([sub({})]);
        const res = await pro.post("/api/v1/me/billing/packs", { packs: 2 });
        expect(res.status).toBe(200);
        expect(pro.calls).toEqual(["change pro month 2"]);
        const starter = setup([sub({ lookupKey: "starter_month" })]);
        const refused = await starter.post("/api/v1/me/billing/packs", { packs: 2 });
        expect(refused.status).toBe(409);
        const tooMany = await pro.post("/api/v1/me/billing/packs", { packs: 21 });
        expect(tooMany.status).toBe(400);
    });
});

describe("the webhook", () => {
    it("refuses a bad signature", async () => {
        const { app, setRead } = setup();
        setRead(() => {
            throw new Error("bad");
        });
        const res = await app.request("/api/stripe/webhook", { method: "POST", body: "{}" });
        expect(res.status).toBe(400);
    });

    it("syncs and clears the cache", async () => {
        const { app, store, dropped } = setup([sub({})]);
        const res = await app.request("/api/stripe/webhook", { method: "POST", body: "{}" });
        expect(res.status).toBe(200);
        expect(store.plans.get("june")?.plan).toBe("pro");
        expect(dropped).toEqual(["june"]);
    });

    it("answers 200 for a customer nobody has", async () => {
        const { app, setRead, dropped } = setup([sub({})]);
        setRead(() => ({ kind: "sync", customer: () => Promise.resolve("cus_gone") }));
        const res = await app.request("/api/stripe/webhook", { method: "POST", body: "{}" });
        expect(res.status).toBe(200);
        expect(dropped).toEqual([]);
    });

    it("answers 500 when Stripe fails, so it's retried", async () => {
        const { app, payments } = setup();
        payments.subscriptions = () => Promise.reject(new Error("down"));
        const res = await app.request("/api/stripe/webhook", { method: "POST", body: "{}" });
        expect(res.status).toBe(500);
    });
});

describe("checkout", () => {
    const body = { plan: "starter", period: "month", from: "edit" };

    it("gives a payment page", async () => {
        const { post } = setup();
        const res = await post("/api/v1/me/billing/checkout", body);
        expect(await res.json()).toEqual({ url: "https://pay.example/1" });
    });

    it("passes on the plan and period chosen, and comes back to the page", async () => {
        const { post, calls } = setup();
        const page = "3f2b8a10-4c5d-4e6f-8a9b-0c1d2e3f4a5b";
        await post("/api/v1/me/billing/checkout", { ...body, plan: "pro", period: "year", page });
        expect(calls).toEqual([
            `checkout pro year https://tondo.page/app/edit?paid=1&page=${page}`,
            "trial true",
        ]);
    });

    it("refuses a plan that doesn't exist, or a page that isn't an id", async () => {
        const { post } = setup();
        const url = "/api/v1/me/billing/checkout";
        expect((await post(url, { ...body, plan: "team" })).status).toBe(400);
        expect((await post(url, { ...body, page: "x&y=1" })).status).toBe(400);
    });

    it("moves Starter to Pro through Stripe's confirm page, and only that way", async () => {
        const { post, calls } = setup([sub({ lookupKey: "starter_month" })]);
        const res = await post("/api/v1/me/billing/checkout", { ...body, plan: "pro" });
        expect(await res.json()).toEqual({ url: "https://pay.example/change" });
        expect(calls).toEqual(["change pro month 1"]);
    });

    it("refuses when a paid subscription exists", async () => {
        const { post, calls } = setup([sub({})]);
        expect((await post("/api/v1/me/billing/checkout", body)).status).toBe(409);
        expect(calls).toEqual([]);
    });

    it("refuses during free months, which paying would end", async () => {
        const { post, store } = setup();
        store.plans.set("june", { plan: "pro", endsAt: new Date(Date.now() + 86_400_000) });
        expect((await post("/api/v1/me/billing/checkout", body)).status).toBe(409);
    });

    it("needs someone logged in, and JSON", async () => {
        const { app } = setup();
        const res = await app.request("/api/v1/me/billing/checkout", {
            method: "POST",
            body: "x",
        });
        expect(res.status).toBe(415);
    });
});
