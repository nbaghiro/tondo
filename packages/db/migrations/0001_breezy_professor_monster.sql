CREATE TABLE "stats" (
	"page_id" uuid NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stats_page_id_target_day_pk" PRIMARY KEY("page_id","target","day")
);
--> statement-breakpoint
ALTER TABLE "stats" ADD CONSTRAINT "stats_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;