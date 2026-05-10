CREATE TABLE IF NOT EXISTS "StreakMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestone" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FitToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FitTokenBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitTokenBalance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StreakMilestone_userId_idx" ON "StreakMilestone"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StreakMilestone_userId_milestone_key" ON "StreakMilestone"("userId", "milestone");

CREATE INDEX IF NOT EXISTS "FitToken_userId_idx" ON "FitToken"("userId");
CREATE INDEX IF NOT EXISTS "FitToken_workoutLogId_idx" ON "FitToken"("workoutLogId");
CREATE INDEX IF NOT EXISTS "FitToken_createdAt_idx" ON "FitToken"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FitToken_userId_workoutLogId_reason_key" ON "FitToken"("userId", "workoutLogId", "reason");

CREATE UNIQUE INDEX IF NOT EXISTS "FitTokenBalance_userId_key" ON "FitTokenBalance"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StreakMilestone_userId_fkey'
    ) THEN
        ALTER TABLE "StreakMilestone"
        ADD CONSTRAINT "StreakMilestone_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FitToken_userId_fkey'
    ) THEN
        ALTER TABLE "FitToken"
        ADD CONSTRAINT "FitToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FitToken_workoutLogId_fkey'
    ) THEN
        ALTER TABLE "FitToken"
        ADD CONSTRAINT "FitToken_workoutLogId_fkey"
        FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutSessionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FitTokenBalance_userId_fkey'
    ) THEN
        ALTER TABLE "FitTokenBalance"
        ADD CONSTRAINT "FitTokenBalance_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
