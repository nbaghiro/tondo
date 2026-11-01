import type { Page, Plan } from "@tondo/page";
import {
    date,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
    timestamp,
    unique,
    uuid,
} from "drizzle-orm/pg-core";

// `id` is the user id from Neon Auth, which also holds their email and password. A row appears when
// someone claims their address.
export const users = pgTable("users", {
    id: text("id").primaryKey(),
    handle: text("handle").notNull().unique(),
    /** Set when a page is taken down for abuse. It stops being served, and the account stays. */
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    plan: text("plan").$type<Plan>().notNull().default("free"),
    stripeId: text("stripe_id").unique(),
    /** When the plan stops, or stopped. Null means it carries on. */
    endsAt: timestamp("ends_at", { withTimezone: true }),
});

// A user has a main page, with an empty slug, and can gain sub-pages. Editing changes the draft, and
// publishing copies it to `published`. `updated_at` also stops one tab's save overwriting another's.
export const pages = pgTable(
    "pages",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        slug: text("slug").notNull().default(""),
        draft: jsonb("draft").$type<Page>().notNull(),
        published: jsonb("published").$type<Page>(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [unique("pages_user_slug").on(table.userId, table.slug)],
);

// Daily counts. An empty target is a view of the page, and any other target is one of its links.
export const stats = pgTable(
    "stats",
    {
        pageId: uuid("page_id")
            .notNull()
            .references(() => pages.id, { onDelete: "cascade" }),
        target: text("target").notNull().default(""),
        day: date("day").notNull(),
        count: integer("count").notNull().default(0),
    },
    (table) => [primaryKey({ columns: [table.pageId, table.target, table.day] })],
);

// Help me credits spent, per person per month. It has no key to users because a person using the
// start flow hasn't got a row there yet. Numbers only: nothing about what was asked.
export const usage = pgTable(
    "usage",
    {
        userId: text("user_id").notNull(),
        month: text("month").notNull(),
        credits: integer("credits").notNull().default(0),
    },
    (table) => [primaryKey({ columns: [table.userId, table.month] })],
);
