import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "pages" ADD COLUMN "hero_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "homepage_hero_image_id" integer;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_media_id_idx" ON "pages_rels" USING btree ("media_id");
  CREATE INDEX "site_settings_rels_order_idx" ON "site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_media_id_idx" ON "site_settings_rels" USING btree ("media_id");
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_homepage_hero_image_id_media_id_fk" FOREIGN KEY ("homepage_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_hero_image_idx" ON "pages" USING btree ("hero_image_id");
  CREATE INDEX "site_settings_homepage_homepage_hero_image_idx" ON "site_settings" USING btree ("homepage_hero_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "site_settings_rels" CASCADE;
  ALTER TABLE "pages" DROP CONSTRAINT "pages_hero_image_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_homepage_hero_image_id_media_id_fk";
  
  DROP INDEX "pages_hero_image_idx";
  DROP INDEX "site_settings_homepage_homepage_hero_image_idx";
  ALTER TABLE "pages" DROP COLUMN "hero_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "homepage_hero_image_id";`)
}
