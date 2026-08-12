-- DropIndex
DROP INDEX IF EXISTS "users_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "unique_active_email" ON "users"("email") WHERE "deleted_at" IS NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
