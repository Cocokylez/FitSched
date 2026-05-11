DO $$
BEGIN
    IF to_regclass('"WorkoutSessionLog"') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM "WorkoutSessionLog"
            GROUP BY "userId", "date"
            HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION 'Cannot add WorkoutSessionLog_userId_date_key because duplicate user/date workout logs exist';
        END IF;

        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutSessionLog_userId_date_key" ON "WorkoutSessionLog"("userId", "date")';
    END IF;
END $$;
