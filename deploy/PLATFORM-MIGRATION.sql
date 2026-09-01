-- ============================================================
-- KABBALAS SHABBOS PLATFORM MIGRATION — transforms the live
-- single-tenant Adas database into the multi-tenant platform schema,
-- preserving every Adas family, check-in, streak, and raffle draw.
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
    "state" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "campaignName" TEXT NOT NULL DEFAULT 'The Kabolas Shabbos Initiative',
    "seasonLabel" TEXT NOT NULL DEFAULT 'Elul 5786',
    "pledgeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "charityName" TEXT NOT NULL DEFAULT 'Tomchei Shabbos',
    "pledgePerSignup" INTEGER NOT NULL DEFAULT 5,
    "raffleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rafflePrize" TEXT NOT NULL DEFAULT 'pizza party',
    "whyText" TEXT,
    "announcementTitle" TEXT,
    "announcementBody" TEXT,
    "announcementUrl" TEXT,
    "announcementUpdatedAt" TIMESTAMP(3),
    "shabbosDates" TEXT NOT NULL,
    "tzOffset" TEXT NOT NULL DEFAULT '-07:00',
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "logoLight" TEXT,
    "logoDark" TEXT,
    "partnerLogoLight" TEXT,
    "partnerLogoDark" TEXT,
    "adminHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "listed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shul_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shul_slug_key" ON "Shul"("slug");
CREATE UNIQUE INDEX "Shul_customDomain_key" ON "Shul"("customDomain");

-- Per-shul resources (PDFs, links) shown on the homepage and /resources
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "shulId" TEXT NOT NULL,
    "kicker" TEXT,
    "title" TEXT NOT NULL,
    "byline" TEXT,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📄',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Resource_shulId_idx" ON "Resource"("shulId");
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_shulId_fkey"
  FOREIGN KEY ("shulId") REFERENCES "Shul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Uploaded logos, served at /api/logo/<id>
CREATE TABLE "ShulAsset" (
    "id" TEXT NOT NULL,
    "shulId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShulAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShulAsset_shulId_idx" ON "ShulAsset"("shulId");
ALTER TABLE "ShulAsset" ADD CONSTRAINT "ShulAsset_shulId_fkey"
  FOREIGN KEY ("shulId") REFERENCES "Shul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adas row. adminHash = sha256('elul:adas:<ADMIN PASSWORD>') — compute it
-- with:  echo -n 'elul:adas:YOURPASSWORD' | sha256sum
-- and replace REPLACE_WITH_ADMIN_HASH below. Charity/pledge/campaign name
-- are copied from the old Campaign row automatically further down.
INSERT INTO "Shul"
  ("id","slug","customDomain","name","partnerName","city","state","contactName","contactEmail",
   "campaignName","seasonLabel","rafflePrize",
   "shabbosDates","tzOffset","timezone",
   "logoLight","logoDark","partnerLogoLight","partnerLogoDark","adminHash",
   "whyText","announcementTitle","announcementBody","announcementUrl","announcementUpdatedAt")
VALUES
  ('shul_adas','adas','shabboswithadas.com','Adas Torah','LINK Kollel','Los Angeles','CA',
   'Daniel Gofman','danielsgofman@gmail.com',
   'The Elul Shabbos Project','Elul 5786','pizza party',
   '2026-08-22,2026-08-29,2026-09-05,2026-09-19','-07:00','America/Los_Angeles',
   '/logo.png','/logo-white.png','/link-logo.png','/link-logo-white.png',
   'REPLACE_WITH_ADMIN_HASH',
   E'Before Rosh Hashanah 5784, Rabbi Revah shared a teaching of the Aruch LaNer: when Rosh Hashanah falls on Shabbos and the shofar goes silent, the year that follows tends to be extraordinary, for blessing or for tragedy. On that day it is not the shofar that pleads for Klal Yisroel. It is Shabbos itself that stands as our meilitz yosher, our advocate. How we hold Shabbos becomes how the year holds us.\n\nWe all remember what came one month later. October 7th changed us, and demanded that we re-examine who we are and what we are committed to.\n\nThis year, Rosh Hashanah falls on Shabbos again.\n\nSo this Elul we are doing our part, every man, woman, and child of Adas Torah, to send Shabbos into the new year as our advocate. One small commitment, each week, together.',
   'The Broken Water Heater',
   'A Dvar Halacha by Rabbi Yisroel Casen: a real-life shailah on melacha, maris ayin, and a mid-Shabbos repair call — bring it to your table this week.',
   '/dvar-halacha-broken-water-heater.pdf',
   CURRENT_TIMESTAMP);

INSERT INTO "Resource" ("id","shulId","kicker","title","byline","description","url","emoji","sortOrder") VALUES
  ('res_adas_dvar','shul_adas','Dvar Halacha','The Broken Water Heater','by Rabbi Yisroel Casen',
   'A real-life shailah on melacha, maris ayin, and a mid-Shabbos repair call — a real discussion-starter for the table.',
   '/dvar-halacha-broken-water-heater.pdf','📖',1),
  ('res_adas_kids','shul_adas','For Children','The Shabbos Helpers Guide',NULL,
   'Fifteen jobs with titles worth owning — from “The Challah Helper” to “The Havdalah Holder” — with a fridge checklist to go with them.',
   '/shabbos-helpers-guide.pdf','🖍️',2);

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
