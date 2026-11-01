ALTER TABLE "pages" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "pages" SET "handle" = "users"."handle" FROM "users" WHERE "pages"."user_id" = "users"."id";--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_handle_unique" UNIQUE("handle");--> statement-breakpoint
ALTER TABLE "pages" DROP CONSTRAINT "pages_user_slug";--> statement-breakpoint
ALTER TABLE "pages" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_handle_unique";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "handle";--> statement-breakpoint
CREATE INDEX "pages_user" ON "pages" USING btree ("user_id");
