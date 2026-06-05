-- AlterTable: moderation fields on User (all additive / backward-compatible)
ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "bannedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "bannedReason" TEXT;

-- CreateTable: SuspiciousFlag
CREATE TABLE "SuspiciousFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuspiciousFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuspiciousFlag_userId_createdAt_idx" ON "SuspiciousFlag"("userId", "createdAt");
CREATE INDEX "SuspiciousFlag_kind_createdAt_idx" ON "SuspiciousFlag"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "SuspiciousFlag" ADD CONSTRAINT "SuspiciousFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
