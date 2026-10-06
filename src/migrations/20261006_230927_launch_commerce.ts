import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pickup_points" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"street" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"zip" varchar NOT NULL,
  	"is_farm" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pickup_points_locales" (
  	"name" varchar NOT NULL,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "orders" ALTER COLUMN "delivery_method" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "delivery_method" SET DEFAULT 'pickup'::text;
  UPDATE "orders" SET "delivery_method" = 'pickup' WHERE "delivery_method" = 'balikovna';
  DROP TYPE "public"."enum_orders_delivery_method";
  CREATE TYPE "public"."enum_orders_delivery_method" AS ENUM('pickup', 'delivery');
  ALTER TABLE "orders" ALTER COLUMN "delivery_method" SET DEFAULT 'pickup'::"public"."enum_orders_delivery_method";
  ALTER TABLE "orders" ALTER COLUMN "delivery_method" SET DATA TYPE "public"."enum_orders_delivery_method" USING "delivery_method"::"public"."enum_orders_delivery_method";
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DEFAULT 'cash'::text;
  UPDATE "orders" SET "payment_method" = 'cash';
  DROP TYPE "public"."enum_orders_payment_method";
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('cash');
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DEFAULT 'cash'::"public"."enum_orders_payment_method";
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE "public"."enum_orders_payment_method" USING "payment_method"::"public"."enum_orders_payment_method";
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'unpaid'::text;
  UPDATE "orders" SET "payment_status" = CASE WHEN "payment_status" = 'paid' THEN 'paid' ELSE 'unpaid' END;
  DROP TYPE "public"."enum_orders_payment_status";
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('unpaid', 'paid');
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'unpaid'::"public"."enum_orders_payment_status";
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE "public"."enum_orders_payment_status" USING "payment_status"::"public"."enum_orders_payment_status";
  ALTER TABLE "carts" ALTER COLUMN "user_id" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_bank_name" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_bank_name" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_account_number" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_bank_code" DROP NOT NULL;
  ALTER TABLE "carts" ADD COLUMN "guest_token" varchar;
  ALTER TABLE "orders" ADD COLUMN "access_token" varchar;
  ALTER TABLE "orders" ADD COLUMN "pickup_point_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pickup_points_id" integer;
  ALTER TABLE "pickup_points_locales" ADD CONSTRAINT "pickup_points_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pickup_points"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pickup_points_updated_at_idx" ON "pickup_points" USING btree ("updated_at");
  CREATE INDEX "pickup_points_created_at_idx" ON "pickup_points" USING btree ("created_at");
  CREATE UNIQUE INDEX "pickup_points_locales_locale_parent_id_unique" ON "pickup_points_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_point_id_pickup_points_id_fk" FOREIGN KEY ("pickup_point_id") REFERENCES "public"."pickup_points"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pickup_points_fk" FOREIGN KEY ("pickup_points_id") REFERENCES "public"."pickup_points"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "carts_guest_token_idx" ON "carts" USING btree ("guest_token");
  CREATE INDEX "orders_access_token_idx" ON "orders" USING btree ("access_token");
  CREATE INDEX "orders_pickup_point_idx" ON "orders" USING btree ("pickup_point_id");
  CREATE INDEX "payload_locked_documents_rels_pickup_points_id_idx" ON "payload_locked_documents_rels" USING btree ("pickup_points_id");
  ALTER TABLE "products" DROP COLUMN "weight";
  ALTER TABLE "products" DROP COLUMN "stripe_product_i_d";
  ALTER TABLE "orders" DROP COLUMN "stripe_payment_intent_i_d";
  ALTER TABLE "orders" DROP COLUMN "qr_spayd";`)

  // Hand-written. Checkout requires a Pickup Point, so every environment gets
  // the farm itself as the first one, taken from SiteSettings when present.
  await db.execute(sql`
   INSERT INTO "pickup_points" ("street", "city", "zip", "is_farm", "active")
  SELECT COALESCE(s."address_street", 'Č.p. 313'), COALESCE(s."address_city", 'Křepice u Hustopečí'), COALESCE(s."address_zip", '691 65'), true, true
  FROM (SELECT 1) AS one LEFT JOIN "site_settings" s ON true
  WHERE NOT EXISTS (SELECT 1 FROM "pickup_points")
  LIMIT 1;
  INSERT INTO "pickup_points_locales" ("name", "note", "_locale", "_parent_id")
  SELECT 'Farma Křepice', 'Po telefonické domluvě.', 'cs'::"_locales", p."id" FROM "pickup_points" p WHERE p."is_farm" = true
    AND NOT EXISTS (SELECT 1 FROM "pickup_points_locales" l WHERE l."_parent_id" = p."id" AND l."_locale" = 'cs');
  INSERT INTO "pickup_points_locales" ("name", "note", "_locale", "_parent_id")
  SELECT 'Křepice farm', 'By phone arrangement.', 'en'::"_locales", p."id" FROM "pickup_points" p WHERE p."is_farm" = true
    AND NOT EXISTS (SELECT 1 FROM "pickup_points_locales" l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_orders_delivery_method" ADD VALUE 'balikovna';
  ALTER TABLE "pickup_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pickup_points_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pickup_points" CASCADE;
  DROP TABLE "pickup_points_locales" CASCADE;
  ALTER TABLE "orders" DROP CONSTRAINT "orders_pickup_point_id_pickup_points_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pickup_points_fk";
  
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE text;
  UPDATE "orders" SET "payment_method" = 'cash_on_delivery' WHERE "payment_method" = 'cash';
  DROP TYPE "public"."enum_orders_payment_method";
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('stripe', 'bank_transfer', 'cash_on_delivery');
  ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE "public"."enum_orders_payment_method" USING "payment_method"::"public"."enum_orders_payment_method";
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'pending'::text;
  UPDATE "orders" SET "payment_status" = 'pending' WHERE "payment_status" = 'unpaid';
  DROP TYPE "public"."enum_orders_payment_status";
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'pending'::"public"."enum_orders_payment_status";
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE "public"."enum_orders_payment_status" USING "payment_status"::"public"."enum_orders_payment_status";
  DROP INDEX "carts_guest_token_idx";
  DROP INDEX "orders_access_token_idx";
  DROP INDEX "orders_pickup_point_idx";
  DROP INDEX "payload_locked_documents_rels_pickup_points_id_idx";
  ALTER TABLE "carts" ALTER COLUMN "user_id" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "delivery_method" DROP DEFAULT;
  ALTER TABLE "orders" ALTER COLUMN "payment_method" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_bank_name" SET DEFAULT 'FIO banka';
  ALTER TABLE "site_settings" ALTER COLUMN "payment_bank_name" SET NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_account_number" SET NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "payment_bank_code" SET NOT NULL;
  ALTER TABLE "products" ADD COLUMN "weight" numeric;
  ALTER TABLE "products" ADD COLUMN "stripe_product_i_d" varchar;
  ALTER TABLE "orders" ADD COLUMN "stripe_payment_intent_i_d" varchar;
  ALTER TABLE "orders" ADD COLUMN "qr_spayd" varchar;
  ALTER TABLE "carts" DROP COLUMN "guest_token";
  ALTER TABLE "orders" DROP COLUMN "access_token";
  ALTER TABLE "orders" DROP COLUMN "pickup_point_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pickup_points_id";`)
}
