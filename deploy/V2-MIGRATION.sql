-- ============================================================
-- V2 MULTI-TENANT MIGRATION — transforms the live single-tenant
-- database into the v2 schema, preserving every Adas family,
-- check-in, streak, and raffle draw.
--
-- ⚠️  DO NOT run this during the live campaign. Run it as part of
-- the v2 cutover (after Shabbos Shuva), immediately before pointing
-- Vercel's production branch at the v2 code. Take a Neon branch
-- (instant snapshot) first: Neon console -> Branches -> Create.
-- ============================================================

BEGIN;

-- 1. The Shul table, with Adas as tenant #1
CREATE TABLE "Shul" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "name" TEXT NOT NULL,
    "partnerName" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Los Angeles',
    "campaignName" TEXT NOT NULL DEFAULT 'The Elul Shabbos Project',
    "charityName" TEXT NOT NULL DEFAULT 'Tomchei Shabbos',
    "pledgePerSignup" INTEGER NOT NULL DEFAULT 5,
    "shabbosDates" TEXT NOT NULL,
    "tzOffset" TEXT NOT NULL DEFAULT '-07:00',
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "logoLight" TEXT,
    "logoDark" TEXT,
    "partnerLogoLight" TEXT,
    "partnerLogoDark" TEXT,
    "adminHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shul_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shul_slug_key" ON "Shul"("slug");
CREATE UNIQUE INDEX "Shul_customDomain_key" ON "Shul"("customDomain");

-- Adas row. adminHash = sha256('elul:adas:<ADMIN PASSWORD>') — compute it
-- with:  echo -n 'elul:adas:YOURPASSWORD' | sha256sum
-- and replace REPLACE_WITH_ADMIN_HASH below. Charity/pledge/campaign name
-- are copied from the old Campaign row automatically further down.
INSERT INTO "Shul"
  ("id","slug","customDomain","name","partnerName","city","shabbosDates","tzOffset","timezone",
   "logoLight","logoDark","partnerLogoLight","partnerLogoDark","adminHash")
VALUES
  ('shul_adas','adas','shabboswithadas.com','Adas Torah','LINK Kollel','Los Angeles',
   '2026-08-22,2026-08-29,2026-09-05,2026-09-19','-07:00','America/Los_Angeles',
   '/logo.png','/logo-white.png','/link-logo.png','/link-logo-white.png',
   'REPLACE_WITH_ADMIN_HASH');

-- Copy campaign settings from the old singleton row
UPDATE "Shul" s SET
  "campaignName" = c."name",
  "charityName" = c."charityName",
  "pledgePerSignup" = c."pledgePerSignup"
FROM "Campaign" c WHERE c."id" = 'campaign' AND s."id" = 'shul_adas';

-- 2. Scope existing data to Adas
ALTER TABLE "Household" ADD COLUMN "shulId" TEXT NOT NULL DEFAULT 'shul_adas';
ALTER TABLE "Household" ALTER COLUMN "shulId" DROP DEFAULT;
DROP INDEX IF EXISTS "Household_token_key";
DROP INDEX IF EXISTS "Household_phone_idx";
DROP INDEX IF EXISTS "Household_email_idx";
CREATE UNIQUE INDEX "Household_shulId_token_key" ON "Household"("shulId","token");
CREATE INDEX "Household_shulId_phone_idx" ON "Household"("shulId","phone");
CREATE INDEX "Household_shulId_email_idx" ON "Household"("shulId","email");
ALTER TABLE "Household" ADD CONSTRAINT "Household_shulId_fkey"
  FOREIGN KEY ("shulId") REFERENCES "Shul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Suggestion" ADD COLUMN "shulId" TEXT NOT NULL DEFAULT 'shul_adas';
ALTER TABLE "Suggestion" ALTER COLUMN "shulId" DROP DEFAULT;
ALTER TABLE "Suggestion" DROP COLUMN IF EXISTS "audience";
CREATE INDEX "Suggestion_shulId_idx" ON "Suggestion"("shulId");
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_shulId_fkey"
  FOREIGN KEY ("shulId") REFERENCES "Shul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RaffleDraw" ADD COLUMN "shulId" TEXT NOT NULL DEFAULT 'shul_adas';
ALTER TABLE "RaffleDraw" ALTER COLUMN "shulId" DROP DEFAULT;
DROP INDEX IF EXISTS "RaffleDraw_week_key";
CREATE UNIQUE INDEX "RaffleDraw_shulId_week_key" ON "RaffleDraw"("shulId","week");
ALTER TABLE "RaffleDraw" ADD CONSTRAINT "RaffleDraw_shulId_fkey"
  FOREIGN KEY ("shulId") REFERENCES "Shul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Retire the old singleton
DROP TABLE IF EXISTS "Campaign";

COMMIT;
