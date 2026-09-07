ALTER TABLE "app"."jobs" ADD COLUMN "service_mode" text DEFAULT 'shop' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."jobs" ADD COLUMN "service_location" text;--> statement-breakpoint
CREATE INDEX "jobs_shop_service_mode_idx" ON "app"."jobs" USING btree ("shop_id","service_mode");