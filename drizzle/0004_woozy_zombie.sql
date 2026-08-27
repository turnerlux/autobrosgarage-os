CREATE TABLE "app"."business_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"standard_labor_rate_cents" integer NOT NULL,
	"diagnosis_fee_cents" integer NOT NULL,
	"warranty_policy_text" text DEFAULT '' NOT NULL,
	"customer_communication_notes" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."business_settings" ADD CONSTRAINT "business_settings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_settings" ADD CONSTRAINT "business_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_settings_shop_idx" ON "app"."business_settings" USING btree ("shop_id");