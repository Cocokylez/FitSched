DO $$
BEGIN
    IF to_regclass('"ChatMessage"') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt")';
    END IF;

    IF to_regclass('"WorkoutLog"') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS "WorkoutLog_userId_date_idx" ON "WorkoutLog"("userId", "date")';
    END IF;

    IF to_regclass('"CalendarEvent"') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS "CalendarEvent_connectionId_startTime_idx" ON "CalendarEvent"("connectionId", "startTime")';
    END IF;

    IF to_regclass('"WorkoutSchedule"') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS "WorkoutSchedule_userId_date_idx" ON "WorkoutSchedule"("userId", "date")';
    END IF;

    IF to_regclass('"WorkoutSessionLog"') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS "WorkoutSessionLog_userId_date_idx" ON "WorkoutSessionLog"("userId", "date")';
    END IF;

    IF to_regclass('"FitToken"') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS "FitToken_userId_createdAt_idx" ON "FitToken"("userId", "createdAt")';
    END IF;
END $$;
