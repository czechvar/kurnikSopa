import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "legal_ico" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "legal_dic" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "legal_registration" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "legal_effective_from" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "legal_ico";
  ALTER TABLE "site_settings" DROP COLUMN "legal_dic";
  ALTER TABLE "site_settings" DROP COLUMN "legal_registration";
  ALTER TABLE "site_settings" DROP COLUMN "legal_effective_from";`)
}
