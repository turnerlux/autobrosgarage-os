CREATE TABLE "app"."diagnostic_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"diagnostic_session_id" uuid NOT NULL,
	"finding_id" uuid,
	"kind" text NOT NULL,
	"object_key" text NOT NULL,
	"original_file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_length" integer NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."diagnostic_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"diagnostic_session_id" uuid NOT NULL,
	"status" text DEFAULT 'suspected' NOT NULL,
	"technician_note" text NOT NULL,
	"customer_facing_summary" text,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."diagnostic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_by" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."diagnostic_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"name" text NOT NULL,
	"measurement_value" text,
	"expected_range" text,
	"result" text NOT NULL,
	"notes" text,
	"performed_by" uuid,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."diagnostic_trouble_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"diagnostic_session_id" uuid NOT NULL,
	"finding_id" uuid,
	"code" text NOT NULL,
	"module" text,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."diagnostic_attachments" ADD CONSTRAINT "diagnostic_attachments_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_attachments" ADD CONSTRAINT "diagnostic_attachments_diagnostic_session_id_diagnostic_sessions_id_fk" FOREIGN KEY ("diagnostic_session_id") REFERENCES "app"."diagnostic_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_attachments" ADD CONSTRAINT "diagnostic_attachments_finding_id_diagnostic_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "app"."diagnostic_findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_attachments" ADD CONSTRAINT "diagnostic_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_findings" ADD CONSTRAINT "diagnostic_findings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_findings" ADD CONSTRAINT "diagnostic_findings_diagnostic_session_id_diagnostic_sessions_id_fk" FOREIGN KEY ("diagnostic_session_id") REFERENCES "app"."diagnostic_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_findings" ADD CONSTRAINT "diagnostic_findings_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_findings" ADD CONSTRAINT "diagnostic_findings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "app"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_tests" ADD CONSTRAINT "diagnostic_tests_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_tests" ADD CONSTRAINT "diagnostic_tests_finding_id_diagnostic_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "app"."diagnostic_findings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_tests" ADD CONSTRAINT "diagnostic_tests_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_trouble_codes" ADD CONSTRAINT "diagnostic_trouble_codes_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "app"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_trouble_codes" ADD CONSTRAINT "diagnostic_trouble_codes_diagnostic_session_id_diagnostic_sessions_id_fk" FOREIGN KEY ("diagnostic_session_id") REFERENCES "app"."diagnostic_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."diagnostic_trouble_codes" ADD CONSTRAINT "diagnostic_trouble_codes_finding_id_diagnostic_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "app"."diagnostic_findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostic_attachments_shop_session_idx" ON "app"."diagnostic_attachments" USING btree ("shop_id","diagnostic_session_id");--> statement-breakpoint
CREATE INDEX "diagnostic_attachments_shop_finding_idx" ON "app"."diagnostic_attachments" USING btree ("shop_id","finding_id");--> statement-breakpoint
CREATE INDEX "diagnostic_findings_shop_session_idx" ON "app"."diagnostic_findings" USING btree ("shop_id","diagnostic_session_id");--> statement-breakpoint
CREATE INDEX "diagnostic_findings_shop_status_idx" ON "app"."diagnostic_findings" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "diagnostic_sessions_shop_job_idx" ON "app"."diagnostic_sessions" USING btree ("shop_id","job_id");--> statement-breakpoint
CREATE INDEX "diagnostic_sessions_shop_status_idx" ON "app"."diagnostic_sessions" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "diagnostic_tests_shop_finding_idx" ON "app"."diagnostic_tests" USING btree ("shop_id","finding_id");--> statement-breakpoint
CREATE INDEX "diagnostic_trouble_codes_shop_session_idx" ON "app"."diagnostic_trouble_codes" USING btree ("shop_id","diagnostic_session_id");--> statement-breakpoint
CREATE INDEX "diagnostic_trouble_codes_shop_finding_idx" ON "app"."diagnostic_trouble_codes" USING btree ("shop_id","finding_id");--> statement-breakpoint
CREATE INDEX "diagnostic_trouble_codes_shop_code_idx" ON "app"."diagnostic_trouble_codes" USING btree ("shop_id","code");