CREATE TABLE "app"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"type" text NOT NULL,
	"display_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"business_name" text,
	"is_dealer" boolean DEFAULT false NOT NULL,
	"phone" text,
	"phone_digits" text,
	"email" text,
	"billing_address" jsonb,
	"notes" text,
	"pricing_profile" text DEFAULT 'standard' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."job_number_counters" (
	"shop_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "job_number_counters_shop_id_year_pk" PRIMARY KEY("shop_id","year")
);
--> statement-breakpoint
CREATE TABLE "app"."jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"job_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"status" text DEFAULT 'checked_in' NOT NULL,
	"complaint" text NOT NULL,
	"mileage_at_check_in" integer,
	"lot_number" text,
	"assigned_technician_id" uuid,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"job_number_prefix" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"role" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"customer_id" uuid,
	"vin" text,
	"year" integer,
	"make" text,
	"model" text,
	"trim" text,
	"engine" text,
	"color" text,
	"license_plate" text,
	"mileage" integer,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."job_number_counters" ADD CONSTRAINT "job_number_counters_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."jobs" ADD CONSTRAINT "jobs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "app"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."jobs" ADD CONSTRAINT "jobs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "app"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."jobs" ADD CONSTRAINT "jobs_assigned_technician_id_users_id_fk" FOREIGN KEY ("assigned_technician_id") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."jobs" ADD CONSTRAINT "jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."users" ADD CONSTRAINT "users_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vehicles" ADD CONSTRAINT "vehicles_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "app"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vehicles" ADD CONSTRAINT "vehicles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_shop_idx" ON "app"."customers" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "customers_shop_name_idx" ON "app"."customers" USING btree ("shop_id","display_name");--> statement-breakpoint
CREATE INDEX "customers_shop_phone_idx" ON "app"."customers" USING btree ("shop_id","phone_digits");--> statement-breakpoint
CREATE INDEX "customers_shop_email_idx" ON "app"."customers" USING btree ("shop_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_shop_job_number_idx" ON "app"."jobs" USING btree ("shop_id","job_number");--> statement-breakpoint
CREATE INDEX "jobs_shop_status_idx" ON "app"."jobs" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "jobs_shop_customer_idx" ON "app"."jobs" USING btree ("shop_id","customer_id");--> statement-breakpoint
CREATE INDEX "jobs_shop_vehicle_idx" ON "app"."jobs" USING btree ("shop_id","vehicle_id");--> statement-breakpoint
CREATE INDEX "jobs_shop_lot_idx" ON "app"."jobs" USING btree ("shop_id","lot_number");--> statement-breakpoint
CREATE INDEX "jobs_shop_technician_idx" ON "app"."jobs" USING btree ("shop_id","assigned_technician_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shops_slug_idx" ON "app"."shops" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "users_shop_idx" ON "app"."users" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_shop_email_idx" ON "app"."users" USING btree ("shop_id","email");--> statement-breakpoint
CREATE INDEX "vehicles_shop_idx" ON "app"."vehicles" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_shop_vin_idx" ON "app"."vehicles" USING btree ("shop_id","vin");--> statement-breakpoint
CREATE INDEX "vehicles_shop_customer_idx" ON "app"."vehicles" USING btree ("shop_id","customer_id");--> statement-breakpoint
CREATE INDEX "vehicles_shop_ymm_idx" ON "app"."vehicles" USING btree ("shop_id","year","make","model");