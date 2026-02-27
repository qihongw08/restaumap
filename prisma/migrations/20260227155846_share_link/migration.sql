-- CreateEnum
CREATE TYPE "ShareLinkType" AS ENUM ('USER_MAP', 'GROUP_MAP');

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "ShareLinkType" NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "target_user_id" TEXT,
    "target_group_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_expires_at_idx" ON "share_links"("expires_at");

-- CreateIndex
CREATE INDEX "share_links_target_user_id_idx" ON "share_links"("target_user_id");

-- CreateIndex
CREATE INDEX "share_links_target_group_id_idx" ON "share_links"("target_group_id");

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_target_group_id_fkey" FOREIGN KEY ("target_group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
