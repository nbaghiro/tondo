ALTER TABLE "users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_id_unique" UNIQUE("stripe_id");