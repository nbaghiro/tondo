CREATE TABLE "usage" (
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_user_id_month_pk" PRIMARY KEY("user_id","month")
);
