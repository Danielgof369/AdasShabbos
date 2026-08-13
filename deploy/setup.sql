-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "familyName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT true,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "unitLabel" TEXT NOT NULL,
    "unitValue" INTEGER NOT NULL DEFAULT 1,
    "audience" TEXT NOT NULL DEFAULT 'both',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "suggestionId" TEXT,
    "customTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL DEFAULT 'campaign',
    "name" TEXT NOT NULL DEFAULT 'The Elul Shabbos Project',
    "startDate" TIMESTAMP(3) NOT NULL,
    "weeks" INTEGER NOT NULL DEFAULT 4,
    "signupDeadline" TIMESTAMP(3),
    "pledgePerSignup" INTEGER NOT NULL DEFAULT 5,
    "pledgePerCheckin" INTEGER NOT NULL DEFAULT 1,
    "charityName" TEXT NOT NULL DEFAULT 'Tomchei Shabbos',

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Household_token_key" ON "Household"("token");

-- CreateIndex
CREATE INDEX "Household_phone_idx" ON "Household"("phone");

-- CreateIndex
CREATE INDEX "Household_email_idx" ON "Household"("email");

-- CreateIndex
CREATE INDEX "Member_householdId_idx" ON "Member"("householdId");

-- CreateIndex
CREATE INDEX "Goal_week_idx" ON "Goal"("week");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_memberId_week_key" ON "Goal"("memberId", "week");

-- CreateIndex
CREATE INDEX "MessageLog_householdId_kind_week_idx" ON "MessageLog"("householdId", "kind", "week");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed data (idempotent)
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a01','Learn Hilchos Shabbos at the table','A few minutes of practical halacha at the seudah — suggested topics coming soon.','tables learning Hilchos Shabbos',1,'adult',1,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a02','Prepare and say a dvar Torah at the table','Prepare something on the parsha to share at the seudah.','divrei Torah shared',1,'adult',2,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a03','Keep your phone off until Rabbeinu Tam','Don''t turn your phone back on until Rabbeinu Tam''s zman after Shabbos.','minutes added to Shabbos',30,'adult',3,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a04','Come 20 minutes early Shabbos morning','Come early to learn or attend the shiur before davening.','minutes of extra learning',20,'adult',4,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a05','Eat a proper Melava Malka','Escort the Shabbos Queen out properly on Motzei Shabbos.','Melava Malkas eaten',1,'adult',5,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a06','Set the Shabbos table Thursday night','Walk into Friday with the table already glowing.','tables set early',1,'adult',6,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a07','Be dressed in bigdei Shabbos by hadlakas neiros','Fully ready, dressed b''kavod, before candle lighting.','times ready before candle lighting',1,'adult',7,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a08','Wash for Seudah Shlishis','Make Seudah Shlishis a proper seudah with hamotzi.','seudos shlishis with hamotzi',1,'adult',8,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a09','Say 3 perakim of Tehillim by candle lighting','Start Shabbos with Tehillim as the candles are lit.','perakim of Tehillim said',3,'adult',9,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a10','Call someone who''d appreciate it before Shabbos','A parent, a grandparent, someone alone — a pre-Shabbos hello.','pre-Shabbos calls made',1,'adult',10,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_a11','Wear bigdei Shabbos all of Shabbos','Stay in your Shabbos best from candle lighting to havdalah.','Shabbosos in full bigdei Shabbos',1,'adult',11,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_k01','Spend 15 minutes helping for Shabbos','Set the table, help in the kitchen — 15 minutes of kavod Shabbos.','minutes kids helped for Shabbos',15,'kid',20,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_k02','Sing zemiros at the table','Bring the niggunim — lead or join the zemiros at the seudah.','tables singing zemiros',1,'kid',21,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_k03','Say a dvar Torah at the table','Share something you learned this week at the seudah.','divrei Torah shared',1,'kid',22,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Suggestion" ("id","title","detail","unitLabel","unitValue","audience","sortOrder","active") VALUES ('sug_k04','Come and stay in shul for Kabbalas Shabbos','Be there from Lecha Dodi through the end.','Kabbalas Shabbos davened in shul',1,'kid',23,true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Campaign" ("id","name","startDate","weeks","signupDeadline","pledgePerSignup","pledgePerCheckin","charityName") VALUES ('campaign','The Elul Shabbos Project','2026-08-09T07:00:00Z',4,'2026-08-15T02:00:00Z',5,1,'Tomchei Shabbos') ON CONFLICT ("id") DO NOTHING;

-- Safe to run on a database created from an older setup.sql:
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "familyName" TEXT;
