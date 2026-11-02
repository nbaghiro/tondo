CREATE TABLE "domains" (
	"page_id" uuid PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "domains_verified_host" ON "domains" USING btree ("host") WHERE verified_at is not null;