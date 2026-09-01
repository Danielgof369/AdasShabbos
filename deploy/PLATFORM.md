# Kabbalas Shabbos — the national platform

One deployment, one database, every shul at **`shulname.kabbalasshabbos.com`**
(plus optional custom domains, like shabboswithadas.com for Adas Torah).
Shuls sign themselves up at **kabbalasshabbos.com/start** in two minutes.

Branch: `claude/kabbalas-shabbos`. Adas production stays on
`claude/ada-torah-elul-signup-rjtgs8` until the cutover below.

## What lives where

| Host | What renders |
| --- | --- |
| `kabbalasshabbos.com` | National landing: story, live national counters, shul directory, **/start** onboarding, **/shuls** directory, **/platform** (operator admin) |
| `<slug>.kabbalasshabbos.com` | That shul's campaign site (homepage, signup, family pages, admin) |
| custom domain (e.g. shabboswithadas.com) | Same, resolved by the `customDomain` column |
| unknown subdomain | "No shul here yet — claim it" page linking to /start |

Resolution is in `lib/tenant.ts`: custom domain → subdomain → bare root
(national) → `DEFAULT_SHUL_SLUG` fallback for localhost/previews.

## Self-serve onboarding (`/start`)

Shul name, city/state, web address (auto-suggested, live availability check,
reserved words blocked), organizer name + email, admin password, campaign
name, season label, start date + number of weeks (Saturdays auto-picked,
each editable/removable), timezone, and the two optional programs:
tzedakah pledge (amount + charity) and weekly raffle (prize).

On submit (`app/api/start/route.ts`): validates everything (dates must be
Saturdays), computes the UTC offset from the IANA zone, creates the `Shul`
row with the 24-item commitment template and the kids' guide resource,
emails the organizer their site + admin links and a next-steps checklist,
and emails **`PLATFORM_NOTIFY_EMAIL`** (you) about the new shul. Honeypot
field + per-IP throttle guard against junk.

## Per-shul settings (their `/admin`)

Campaign name, season label, partner name, organizer email, **pledge on/off**
(amount + charity), **raffle on/off** (prize name), directory listing on/off,
custom "Why we're doing this" text, a homepage **announcement popup**
(title/text/link — saving re-arms it for every device), and **resources**
(PDFs/links shown on the homepage and /resources). Everything else they had
before: commitment list editor, reminders, WhatsApp blast texts, raffle draw,
merge/delete families, CSV export.

Every piece of pledge/raffle copy on the site, in emails, and in blast texts
is conditional on those toggles, and the raffle prize is never hardcoded.

## Operator admin (`/platform`)

`PLATFORM_ADMIN_PASSWORD` opens it. Lists every shul with counts, organizer
contact, active/listed flags; edit dates, timezone, custom domain, logos,
partner; reset a shul's admin password; add a shul by hand.

## Environment variables

| Var | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres (pooled string) | unchanged |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | email | `EMAIL_FROM="Kabbalas Shabbos <hello@kabbalasshabbos.com>"` |
| `CRON_SECRET` | protects the cron routes | unchanged |
| `PLATFORM_ADMIN_PASSWORD` | opens `/platform` | strong secret |
| `PLATFORM_NOTIFY_EMAIL` | gets a note on every new shul | your email |
| `PLATFORM_CONTACT_EMAIL` | shown on the site as the contact address | `hello@kabbalasshabbos.com` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | the wildcard parent domain | `kabbalasshabbos.com` |
| `DEFAULT_SHUL_SLUG` | optional: tenant for localhost / Vercel preview URLs | `adas` (leave unset to preview the national site) |

Retired (superseded by the DB): `ADMIN_PASSWORD`, `NEXT_PUBLIC_SHUL_NAME`,
`NEXT_PUBLIC_PARTNER_NAME`, `NEXT_PUBLIC_CITY`, `NEXT_PUBLIC_BASE_URL`,
`CAMPAIGN_SHABBOS_DATES`, `CAMPAIGN_TZ_OFFSET`, `CAMPAIGN_TIMEZONE`.

## Cutover plan (after Shabbos Shuva — NOT during the live Adas campaign)

1. **Snapshot**: Neon console → Branches → create a branch of production.
2. **Migrate data**: compute the Adas admin hash
   (`echo -n 'elul:adas:YOURPASSWORD' | sha256sum`), paste it into
   `deploy/PLATFORM-MIGRATION.sql`, run that file in the Neon SQL Editor.
   It creates `Shul` + `Resource`, makes Adas tenant #1 (with its why-text,
   Dvar Halacha popup and both resources), and rewires every family,
   check-in and raffle draw to it. Nothing is deleted.
3. **Domains** (Vercel → project → Settings → Domains):
   add `kabbalasshabbos.com` and the wildcard `*.kabbalasshabbos.com`.
   Wildcards need the domain's nameservers pointed at Vercel — Vercel shows
   the two NS records to set at GoDaddy. Keep shabboswithadas.com attached
   to the project directly (it is Adas's custom domain now, not a redirect);
   theelulshabbosproject.com can redirect to kabbalasshabbos.com.
4. **Resend**: verify `kabbalasshabbos.com` as a sending domain and set
   `EMAIL_FROM` to it, so every shul's mail comes from the platform.
5. **Env vars**: add the new ones above; remove the retired ones.
6. **Ship code**: point Vercel's production branch at `claude/kabbalas-shabbos`
   (or merge it into the production branch). shabboswithadas.com renders as
   the Adas tenant with identical data; kabbalasshabbos.com is the national site.
7. **Verify**: shabboswithadas.com unchanged; `/platform` opens; run through
   `/start` with a test shul, check its subdomain, then deactivate it.

## Onboarding a shul (after cutover)

Send them **kabbalasshabbos.com/start**. That's it. They get the welcome
email; you get the notification. When they reply with a logo, drop it in
`/public/<slug>-logo.png` (or any public URL) and paste the path in their
entry at `/platform`. A custom domain = add it in Vercel + paste it into
their `/platform` entry.

## Costs

- Vercel Pro ($20/mo) once there are more than a few shuls: cron reliability
  and longer function timeouts for the reminder blasts.
- Neon: free tier holds well past 50 small shuls; Launch tier if it doesn't.
- **Resend is the real cost**: every shul's reminders come from your account.
  Pro (50k emails/mo) covers roughly 15–25 shuls of ~100 families through a
  4-week campaign; Scale beyond that. Worth a small per-shul contribution
  once there are more than a handful.

## Local testing

```bash
sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
rm -f prisma/dev.db
DATABASE_URL="file:./dev.db" npx prisma db push --skip-generate && npx prisma generate
DATABASE_URL="file:./dev.db" SEED_DEMO=1 SEED_ADMIN_PASSWORD=adas-pass npx prisma db seed
DATABASE_URL="file:./dev.db" NEXT_PUBLIC_ROOT_DOMAIN=localhost PLATFORM_ADMIN_PASSWORD=plat npm run build
DATABASE_URL="file:./dev.db" NEXT_PUBLIC_ROOT_DOMAIN=localhost PLATFORM_ADMIN_PASSWORD=plat PORT=3111 npm run start -- -p 3111
# http://localhost:3111 = national · http://adas.localhost:3111 · http://demo.localhost:3111
```
Flip the provider back to `postgresql` and re-run `npx prisma generate`
before committing.

## Roadmap (next phases)

1. **Donations** — Stripe Checkout per shul (sponsor-a-family, one-off gifts), with the pledge total becoming real money.
2. **Magic-link admin login** for shuls (no shared passwords), multiple admins per shul.
3. **PWA / app** — installable home-screen app with push notifications for reminders instead of only email.
4. **Agent follow-ups** — automated, personalized nudges (WhatsApp/SMS via Twilio, already wired) driven by each family's check-in history.
5. **Multi-season** — archive a campaign and start the next one (Shovavim, Sefirah) without losing history.
6. **City pages** — chicago.kabbalasshabbos.com rolling up several shuls.
