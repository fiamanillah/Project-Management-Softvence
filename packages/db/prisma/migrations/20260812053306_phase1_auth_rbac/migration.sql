/*
  Warnings:

  - You are about to drop the column `entity_table` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `new_payload` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `old_payload` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `on_behalf_of_id` on the `audit_logs` table. All the data in the column will be lost.
  - Added the required column `entity_type` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('INVITE', 'PASSWORD_RESET');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_on_behalf_of_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_entity_table_entity_id_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "entity_table",
DROP COLUMN "new_payload",
DROP COLUMN "old_payload",
DROP COLUMN "on_behalf_of_id",
ADD COLUMN     "details" JSONB,
ADD COLUMN     "entity_type" TEXT NOT NULL,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "entity_id" DROP NOT NULL,
ALTER COLUMN "entity_id" SET DATA TYPE TEXT,
ALTER COLUMN "actor_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_idx" ON "auth_tokens"("user_id");

-- CreateIndex
CREATE INDEX "auth_tokens_token_hash_idx" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
