-- AlterTable
-- Convert existing UTC-shifted timestamps to the app's local calendar day
-- (stored values are UTC representations of the app's local midnight).
ALTER TABLE "Transaction" ALTER COLUMN "date" SET DATA TYPE DATE
  USING ((date AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/London')::date);
