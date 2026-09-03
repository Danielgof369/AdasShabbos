# Kabalos Shabbos — the national platform

One deployment, one database, every shul at **`shulname.kabalosshabbos.com`**
(plus optional custom domains, like shabboswithadas.com for Adas Torah).
Shuls sign themselves up at **kabalosshabbos.com/start** in two minutes.

Branch: `claude/kabbalas-shabbos`. Adas production stays on
`claude/ada-torah-elul-signup-rjtgs8` until the cutover below.

## What lives where

| Host | What renders |
| --- | --- |
| `kabalosshabbos.com` | National landing: story, live national counters, shul directory, **/start** onboarding, **/shuls** directory, **/platform** (operator admin) |
| `<slug>.kabalosshabbos.com` | That shul's campaign site (homepage, signup, family pages, admin) |
| custom domain (e.g. shabboswithadas.com) | Same, resolved by the `customDomain` column |
| unknown subdomain | "No shul here yet — claim it" page linking to /start |

Resolution is in `lib/tenant.ts`: custom domain → subdomain → bare root
(national) → `DEFAULT_SHUL_SLUG` fallback for localhost/previews.

## National signup (`/join`) — the main path

Everyone signs up through one form on the national site — individuals or
whole families — with a city (curated dropdown) and an optional "your
shul" note. Nobody can create a shul from the public site. Solo signups
attach to an unlisted catch-all shul (`individuals`); at `/platform` the
"shul requests" section groups those notes and one click creates the real
shul (`hasSite = false`, listed, seeded with the program's list) and moves
the families onto it — or moves them into an existing shul. Their link is
`kabalosshabbos.com/c/<token>`; every shul has a page at `/s/<slug>`
showing families, streaks, counters, and the kehilla kabbolos. Reminders,
check-ins, chasers, and housekeeping work the same; national shuls just
have no admin of their own (you manage them at `/platform`; a shul that
wants its own admin and subdomain goes through `/start` — see below).

The commitment list (`lib/suggestionTemplate.ts`) is the Kedushas Shabbos
program in three tiers: **individual** (per person), **family** (adults
pick for the household), **kehilla** (shown on the shul page; a shul admin
marks the ones the kehilla took on by making them active). The **national season**
(label, Shabbos dates, timezone) is edited at `/platform` and applied to
every national shul; `NATIONAL_SEASON_LABEL`, `NATIONAL_SHABBOS_DATES`,
`NATIONAL_TIMEZONE` are only the first-run defaults (Tishrei 5787: every Shabbos from Rosh Hashanah through Bereishis). Partner logo files: `public/kedushas-shabbos.png` and
`public/kedushas-shabbos-white.png` (light and dark grounds); the slots light
up when the files exist. Footer credit link: `BUILDER_URL`.

## Self-serve onboarding (`/start`) — for shuls that want their own site

Shul name, city/state, web address (auto-suggested, live availability check,
reserved words blocked), organizer name + email, admin password, campaign
name, season label, start date + number of weeks (Saturdays auto-picked,
each editable/removable), timezone, and the two optional programs:
tzedakah pledge (amount + charity) and weekly raffle (prize).

On submit (`app/api/start/route.ts`): validates everything (dates must be
Saturdays), computes the UTC offset from the IANA zone, creates the `Shul`
row **unapproved** with the 24-item commitment template and the kids' guide
resource, emails the organizer their admin link and a next-steps checklist,
and emails **`PLATFORM_NOTIFY_EMAIL`** (you) an "APPROVE:" note. Honeypot
field + per-IP throttle guard against junk.

**Approval**: until you press "Approve & open" at `/platform`, the shul's
public pages show "almost ready", its signup/find/check-in APIs refuse,
it's hidden from the directory and national counters, and crons skip it.
Its `/admin` works immediately so the organizer can prepare. Approving
emails the organizer their live link and a WhatsApp announcement. Shuls you
add by hand at `/platform` are approved on creation.

## Per-shul settings (their `/admin`)

Campaign name, season label, partner name, organizer email, **pledge on/off**
(amount + charity), **raffle on/off** (prize name), directory listing on/off,
custom "Why we're doing this" text, a homepage **announcement popup**
(title/text/link — saving re-arms it for every device), **resources**
(PDFs/links shown on the homepage and /resources), **Shabbos dates +
timezone**, **logo uploads** (stored in the DB, served at `/api/logo/<id>`),
**their own password**, and a **free-text message** to every family (or only
those with an open check-in) with `{family}`/`{link}` placeholders.
Everything else they had before: commitment list editor, reminders, WhatsApp
blast texts, raffle draw, merge/delete families, CSV export. Only custom
domains still need the operator (Vercel).

Every piece of pledge/raffle copy on the site, in emails, and in blast texts
is conditional on those toggles, and the raffle prize is never hardcoded.

## Support

Shuls ask for anything the admin page can't do via the form at the bottom
of `/admin` (or support@kabalosshabbos.com). An hourly Routine reads that
inbox, makes code changes as pull requests, and drafts replies. Full
description and setup: [`SUPPORT.md`](SUPPORT.md).

## Operator admin (`/platform`)

`PLATFORM_ADMIN_PASSWORD` opens it. Lists every shul with counts, organizer
contact, active/listed flags; edit dates, timezone, custom domain, logos,
partner; reset a shul's admin password; add a shul by hand.

## Environment variables

| Var | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres (pooled string) | unchanged |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | email | `EMAIL_FROM="Kabalos Shabbos <hello@kabalosshabbos.com>"` |
| `CRON_SECRET` | protects the cron routes | unchanged |
| `PLATFORM_ADMIN_PASSWORD` | opens `/platform` | strong secret |
| `AUTH_SECRET` | mixed into admin cookies so a leaked DB row can't forge a session (falls back to `CRON_SECRET`) | random 32+ chars |
| `CRON_BUDGET_MS` | optional: how long a cron sweep may run before deferring remaining shuls (default 240000) | `240000` |
| `PLATFORM_NOTIFY_EMAIL` | gets a note on every new shul | your email |
| `PLATFORM_CONTACT_EMAIL` | support address shown on the site and used by the /admin request form | `support@kabalosshabbos.com` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | the wildcard parent domain | `kabalosshabbos.com` |
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
   add `kabalosshabbos.com` and the wildcard `*.kabalosshabbos.com`.
   Wildcards need the domain's nameservers pointed at Vercel — Vercel shows
   the two NS records to set at GoDaddy. Keep shabboswithadas.com attached
   to the project directly (it is Adas's custom domain now, not a redirect);
   theelulshabbosproject.com can redirect to kabalosshabbos.com.
4. **Resend**: verify `kabalosshabbos.com` as a sending domain and set
   `EMAIL_FROM` to it, so every shul's mail comes from the platform.
5. **Env vars**: add the new ones above; remove the retired ones.
6. **Ship code**: point Vercel's production branch at `claude/kabbalas-shabbos`
   (or merge it into the production branch). shabboswithadas.com renders as
   the Adas tenant with identical data; kabalosshabbos.com is the national site.
7. **Verify**: shabboswithadas.com unchanged; `/platform` opens; run through
   `/start` with a test shul, check its subdomain, then deactivate it.

## Onboarding a shul (after cutover)

Send them **kabalosshabbos.com/start**. That's it. They get the welcome
email; you get the notification. When they reply with a logo, drop it in
`/public/<slug>-logo.png` (or any public URL) and paste the path in their
entry at `/platform`. A custom domain = add it in Vercel + paste it into
their `/platform` entry.

## Scale notes

- **Email is batched**: reminders go through Resend's batch endpoint, 100
  per request, so a 500-family shul is 5 requests, not 500. Twilio (if
  configured) stays one message per household.
- **Cron sweeps have a time budget** (`CRON_BUDGET_MS`, default 4 minutes
  against Vercel's 5-minute limit). Shuls left over are logged as deferred;
  since every send is deduped per household/kind/week, the next run or an
  admin's button press picks them up. Past ~150 active shuls, split the
  sweep (e.g. two cron entries with a slug range) or move it to a queue.
- **National counters and the directory** use grouped queries and a 60s
  per-instance cache; they never load individual goals.
- **Tenant lookup** is one indexed query per request (custom domain, then
  slug), cached per render. Logos are served from `/api/logo/<id>` with
  immutable caching, so the CDN absorbs them after the first hit.
- **Per-shul pages** scale with that shul only. The admin page loads every
  household with goals; fine to ~1,000 families, paginate beyond that.

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
DATABASE_URL="file:./dev.db" SEED_SAMPLES=1 SEED_ADMIN_PASSWORD=adas-pass npx prisma db seed
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
6. **City pages** — chicago.kabalosshabbos.com rolling up several shuls.
