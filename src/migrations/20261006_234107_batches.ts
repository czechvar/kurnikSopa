import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_sold_by" AS ENUM('unit', 'batch');
  CREATE TYPE "public"."enum_batches_status" AS ENUM('planned', 'open', 'closed', 'completed', 'cancelled');
  CREATE TABLE "batches_pickup_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"pickup_point_id" integer NOT NULL
  );
  
  CREATE TABLE "batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"status" "enum_batches_status" DEFAULT 'planned' NOT NULL,
  	"capacity" numeric NOT NULL,
  	"booked_count" numeric DEFAULT 0,
  	"confirmation_deadline" timestamp(3) with time zone,
  	"opened_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "batches_locales" (
  	"label" varchar NOT NULL,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT 'confirmed'::text;
  UPDATE "orders" SET "order_status" = CASE "order_status"
    WHEN 'received' THEN 'confirmed'
    WHEN 'preparing' THEN 'confirmed'
    WHEN 'shipped' THEN 'ready'
    WHEN 'delivered' THEN 'picked_up'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'confirmed' END;
  DROP TYPE "public"."enum_orders_order_status";
  CREATE TYPE "public"."enum_orders_order_status" AS ENUM('booked', 'confirmed', 'ready', 'picked_up', 'released', 'cancelled');
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT 'confirmed'::"public"."enum_orders_order_status";
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DATA TYPE "public"."enum_orders_order_status" USING "order_status"::"public"."enum_orders_order_status";
  ALTER TABLE "orders_items" ALTER COLUMN "price_at_purchase" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "order_number" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "total_amount" SET DEFAULT 0;
  ALTER TABLE "products" ADD COLUMN "sold_by" "enum_products_sold_by" DEFAULT 'unit' NOT NULL;
  ALTER TABLE "products" ADD COLUMN "average_weight" numeric;
  ALTER TABLE "products" ADD COLUMN "weight_range" varchar;
  ALTER TABLE "orders_items" ADD COLUMN "estimated_total" numeric;
  ALTER TABLE "orders_items" ADD COLUMN "actual_weight" numeric;
  ALTER TABLE "orders_items" ADD COLUMN "actual_total" numeric;
  ALTER TABLE "orders" ADD COLUMN "batch_id" integer;
  ALTER TABLE "orders" ADD COLUMN "final_amount" numeric;
  ALTER TABLE "orders" ADD COLUMN "cash_taken" numeric;
  ALTER TABLE "orders" ADD COLUMN "pickup_day" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "confirmed_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "released_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "reminder_sent_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "picked_up_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "batches_id" integer;
  ALTER TABLE "batches_pickup_days" ADD CONSTRAINT "batches_pickup_days_pickup_point_id_pickup_points_id_fk" FOREIGN KEY ("pickup_point_id") REFERENCES "public"."pickup_points"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "batches_pickup_days" ADD CONSTRAINT "batches_pickup_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "batches" ADD CONSTRAINT "batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "batches_locales" ADD CONSTRAINT "batches_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "batches_pickup_days_order_idx" ON "batches_pickup_days" USING btree ("_order");
  CREATE INDEX "batches_pickup_days_parent_id_idx" ON "batches_pickup_days" USING btree ("_parent_id");
  CREATE INDEX "batches_pickup_days_pickup_point_idx" ON "batches_pickup_days" USING btree ("pickup_point_id");
  CREATE INDEX "batches_product_idx" ON "batches" USING btree ("product_id");
  CREATE INDEX "batches_status_idx" ON "batches" USING btree ("status");
  CREATE INDEX "batches_updated_at_idx" ON "batches" USING btree ("updated_at");
  CREATE INDEX "batches_created_at_idx" ON "batches" USING btree ("created_at");
  CREATE UNIQUE INDEX "batches_locales_locale_parent_id_unique" ON "batches_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "orders" ADD CONSTRAINT "orders_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_batches_fk" FOREIGN KEY ("batches_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_batch_idx" ON "orders" USING btree ("batch_id");
  CREATE INDEX "orders_order_status_idx" ON "orders" USING btree ("order_status");
  CREATE INDEX "payload_locked_documents_rels_batches_id_idx" ON "payload_locked_documents_rels" USING btree ("batches_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "batches_pickup_days" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "batches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "batches_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "batches_pickup_days" CASCADE;
  DROP TABLE "batches" CASCADE;
  DROP TABLE "batches_locales" CASCADE;
  ALTER TABLE "orders" DROP CONSTRAINT "orders_batch_id_batches_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_batches_fk";
  
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DATA TYPE text;
  UPDATE "orders" SET "order_status" = CASE "order_status"
    WHEN 'booked' THEN 'received'
    WHEN 'confirmed' THEN 'received'
    WHEN 'ready' THEN 'shipped'
    WHEN 'picked_up' THEN 'delivered'
    WHEN 'released' THEN 'cancelled'
    ELSE 'cancelled' END;
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT 'received'::text;
  DROP TYPE "public"."enum_orders_order_status";
  CREATE TYPE "public"."enum_orders_order_status" AS ENUM('received', 'preparing', 'shipped', 'delivered', 'cancelled');
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT 'received'::"public"."enum_orders_order_status";
  ALTER TABLE "orders" ALTER COLUMN "order_status" SET DATA TYPE "public"."enum_orders_order_status" USING "order_status"::"public"."enum_orders_order_status";
  DROP INDEX "orders_batch_idx";
  DROP INDEX "orders_order_status_idx";
  DROP INDEX "payload_locked_documents_rels_batches_id_idx";
  ALTER TABLE "orders_items" ALTER COLUMN "price_at_purchase" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "total_amount" DROP DEFAULT;
  ALTER TABLE "products" DROP COLUMN "sold_by";
  ALTER TABLE "products" DROP COLUMN "average_weight";
  ALTER TABLE "products" DROP COLUMN "weight_range";
  ALTER TABLE "orders_items" DROP COLUMN "estimated_total";
  ALTER TABLE "orders_items" DROP COLUMN "actual_weight";
  ALTER TABLE "orders_items" DROP COLUMN "actual_total";
  ALTER TABLE "orders" DROP COLUMN "batch_id";
  ALTER TABLE "orders" DROP COLUMN "final_amount";
  ALTER TABLE "orders" DROP COLUMN "cash_taken";
  ALTER TABLE "orders" DROP COLUMN "pickup_day";
  ALTER TABLE "orders" DROP COLUMN "confirmed_at";
  ALTER TABLE "orders" DROP COLUMN "released_at";
  ALTER TABLE "orders" DROP COLUMN "reminder_sent_at";
  ALTER TABLE "orders" DROP COLUMN "picked_up_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "batches_id";
  DROP TYPE "public"."enum_products_sold_by";
  DROP TYPE "public"."enum_batches_status";`)
}
