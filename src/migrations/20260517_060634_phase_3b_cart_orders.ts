import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_locale" AS ENUM('cs', 'en');
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'staff' BEFORE 'customer';
  CREATE TABLE "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "orders" ADD COLUMN "preferred_date" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "customer_note" varchar;
  ALTER TABLE "orders" ADD COLUMN "locale" "enum_orders_locale" DEFAULT 'cs' NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "qr_spayd" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "carts_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "notification_email" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_bank_name" varchar DEFAULT 'FIO banka' NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "payment_account_prefix" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_account_number" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_bank_code" varchar;
  UPDATE "site_settings" SET "payment_account_number" = '' WHERE "payment_account_number" IS NULL;
  UPDATE "site_settings" SET "payment_bank_code" = '' WHERE "payment_bank_code" IS NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_account_number" SET NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_bank_code" SET NOT NULL;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE INDEX "carts_user_idx" ON "carts" USING btree ("user_id");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "carts_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "carts_items" CASCADE;
  DROP TABLE "carts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_carts_fk";
  
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'customer');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  DROP INDEX "payload_locked_documents_rels_carts_id_idx";
  ALTER TABLE "orders" DROP COLUMN "preferred_date";
  ALTER TABLE "orders" DROP COLUMN "customer_note";
  ALTER TABLE "orders" DROP COLUMN "locale";
  ALTER TABLE "orders" DROP COLUMN "qr_spayd";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "carts_id";
  ALTER TABLE "site_settings" DROP COLUMN "notification_email";
  ALTER TABLE "site_settings" DROP COLUMN "payment_bank_name";
  ALTER TABLE "site_settings" DROP COLUMN "payment_account_prefix";
  ALTER TABLE "site_settings" DROP COLUMN "payment_account_number";
  ALTER TABLE "site_settings" DROP COLUMN "payment_bank_code";
  DROP TYPE "public"."enum_orders_locale";`)
}
