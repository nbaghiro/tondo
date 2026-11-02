import type { Page, Plan } from "@tondo/page";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
    boolean,
    check,
    date,
    integer,
    index,
    jsonb,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

// `id` is the user id from Neon Auth, which also holds their email and password. A row appears when
// someone claims their first address.
export const users = pgTable("users", {
    id: text("id").primaryKey(),
    /** Set when a person is taken down for abuse. None of their pages are served, and the account stays. */
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    plan: text("plan").$type<Plan>().notNull().default("free"),
    stripeId: text("stripe_id").unique(),
    /** When the plan stops, or stopped. Null means it carries on. */
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Can edit any page on their team. The owner is `teams.owner_id`, and everyone else is a member. */
    editor: boolean("editor").notNull().default(false),
    /** Pro is sold per pack of pages. This is the subscription's quantity, copied from Stripe. */
    packs: integer("packs").notNull().default(1),
});

// A person's team is the one they own, or the one their joined page is on, so `users` doesn't say.
export const teams = pgTable("teams", {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
        .notNull()
        .unique()
        .references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
    /** Invitation links made before this stop working. */
    invitesFrom: timestamp("invites_from", { withTimezone: true }).notNull().defaultNow(),
});

// Every page has its own address, and nothing public connects one person's pages. Editing changes the
// draft, and publishing copies it to `published`. `updated_at` also stops one tab's save overwriting
// another's. With only `user_id` a page is that person's. With both it's theirs and has joined the team.
// With only `team_id` it's the team's own, and the team's oldest one holds the team's look.
export const pages = pgTable(
    "pages",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
        // Deleting a team clears joined rows first, so this only ever takes the team's own pages.
        teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
        handle: text("handle").notNull().unique(),
        draft: jsonb("draft").$type<Page>().notNull(),
        published: jsonb("published").$type<Page>(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("pages_user").on(table.userId),
        index("pages_team").on(table.teamId),
        check("pages_have_owner", sql`num_nonnulls(${table.userId}, ${table.teamId}) >= 1`),
        // One page per person on a team, which also means one team per person.
        uniqueIndex("pages_one_joined")
            .on(table.userId)
            .where(sql`user_id is not null and team_id is not null`),
    ],
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
