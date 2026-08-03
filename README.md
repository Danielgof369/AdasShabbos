# The Elul Shabbos Project — Adas Torah

A mobile-first campaign site for the month of Elul: everyone in the shul —
men, women, and kids — signs up to take on **one extra thing for Shabbos each
week**, gets a reminder on Thursday, checks in after Shabbos, and picks their
commitment for the next week. Every signup and every check-in adds to a
running pledge to Tomchei Shabbos, and the homepage shows a live "highlight
reel" of what the community has taken on (minutes added to Shabbos, tables
set, challos baked…).

## How the flow works

1. **Sign up** (`/signup`) — name + phone and/or email, add as many family
   members as you like (kids get a kid-friendly option list), and each person
   picks their week-1 commitment. No passwords.
2. **Thursday reminder** — each household gets one message listing what
   everyone committed to, with their personal link. Anyone who hasn't picked
   yet gets nudged to choose.
3. **Check in** (`/c/<token>`) — after Shabbos (Sunday reminder), tap
   "I did it ✓". The shul-wide numbers and the Tomchei Shabbos pledge tick up,
   and the page immediately asks for next week's commitment — same again, a
   different option, or a write-in.
4. **Repeat** for every week of the campaign. Progress shows as
   "Week 2 of 4" circles per person.

`/find` lets anyone recover their personal link by entering the phone/email
they signed up with.

## Admin

`/admin` (password from `ADMIN_PASSWORD`):

- live stats + pledge total
- every signup with per-week status
- edit the commitment options — **title, and the unit each check-in adds to
  the highlight reel** (e.g. "10 × minutes added to Shabbos")
- campaign settings (start date, number of weeks, pledge amounts, charity)
- manually trigger either reminder run (deduped — safe to press twice)
- CSV export

## Running locally

```bash
npm install
npx prisma db push        # creates prisma/dev.db (SQLite)
npx tsx prisma/seed.ts    # seeds placeholder commitment options + campaign config
npm run dev
```

Copy `.env.example` to `.env` and fill in what you have. With **no** provider
keys set, reminder messages print to the server console — the whole flow is
testable without any accounts.

## Reminders / crons

Two endpoints do the sending (both idempotent per household per week, guarded
by `CRON_SECRET` as `Authorization: Bearer <secret>` or `?key=<secret>`):

- `GET /api/cron/thursday` — "Shabbos is coming" reminder (scheduled Thu 9am PT)
- `GET /api/cron/checkin` — "how did it go? check in" reminder (scheduled Sun 9am PT)

`vercel.json` schedules both on Vercel; on any other host, point any cron
service at those URLs.

## Messaging channels

Priority per household: **WhatsApp → SMS → email → console**.

- **SMS**: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
  Note: US carriers require A2P 10DLC registration for the sending number —
  start that approval in the Twilio console ASAP (it can take days to weeks).
- **WhatsApp**: set `TWILIO_WHATSAPP_FROM` (requires Meta business
  verification + approved templates via Twilio; SMS falls back automatically
  until then).
- **Email**: set `RESEND_API_KEY` + `EMAIL_FROM` (verify the sending domain in
  Resend). Free tier is plenty at shul scale.

## Deploying (Vercel + Postgres)

1. Change `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`.
2. Create a Postgres database (Supabase/Neon/Vercel Postgres) and set
   `DATABASE_URL`.
3. `npx prisma db push && npx tsx prisma/seed.ts` against that database.
4. Deploy to Vercel with the env vars from `.env.example`
   (`NEXT_PUBLIC_BASE_URL` should be the real site URL — it's used in the
   reminder links). Vercel picks up `vercel.json` cron schedules
   automatically when `CRON_SECRET` is set.
5. Point a subdomain (e.g. `elul.adastorah.org`) at the Vercel project.

## Notes & decisions

- **Households**: one phone/email = one household = one check-in link for the
  whole family. Signing up again with the same contact adds people to the
  existing household.
- **Weeks** run Sunday → Shabbos. Check-ins for a week open once its Shabbos
  arrives and stay open ~8 days, so Motzei Shabbos and Sunday check-ins both
  land on the right week.
- **Privacy**: the homepage shows only anonymous aggregates. The personal
  link token is unguessable; `/find` will take anyone who knows a signup's
  phone/email to that household's page (fine at shul scale — swap for a
  send-me-my-link flow if that ever feels too open).
- **Seed suggestions are placeholders** — replace them in `/admin` (or edit
  `prisma/seed.ts`) once the real campaign list is finalized.
- The donation counter is a **pledge display** (sponsor pays offline); no
  payment processing on the site.
