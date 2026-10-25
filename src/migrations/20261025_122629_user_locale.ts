import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_locale" AS ENUM('cs', 'en');
  ALTER TABLE "users" ADD COLUMN "locale" "enum_users_locale" DEFAULT 'cs' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "locale";
  DROP TYPE "public"."enum_users_locale";`)
}
