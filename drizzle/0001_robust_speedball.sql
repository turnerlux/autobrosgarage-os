CREATE TABLE "app"."audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"source" text NOT NULL,
	"approval_reference" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_events_shop_created_idx" ON "app"."audit_events" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_shop_entity_idx" ON "app"."audit_events" USING btree ("shop_id","entity_type","entity_id");