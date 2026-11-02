CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"invites_from" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "editor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pages_team" ON "pages" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_one_joined" ON "pages" USING btree ("user_id") WHERE user_id is not null and team_id is not null;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_have_owner" CHECK (num_nonnulls("pages"."user_id", "pages"."team_id") >= 1);