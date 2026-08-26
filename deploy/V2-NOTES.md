# V2 — one platform, many shuls

This branch (`claude/elul-v2-multitenant`) turns the site into a true
multi-tenant platform: **one deployment, one database, every shul at
`shulname.theelulshabbosproject.com`** (plus optional custom domains, like
shabboswithadas.com for Adas). Onboarding a shul is a 60-second form, not a
45-minute fork.

## What changed

- **`Shul` table** — one row per community: name, partner, city, campaign
  name, charity, pledge, Shabbos dates + timezone, logos, custom domain, and
  a per-shul admin password. The old `Campaign` singleton is gone.
- **Tenant resolution** (`lib/tenant.ts`) — the request's Host header picks
  the shul: custom domain first, then `<slug>.<ROOT_DOMAIN>`, then the
  `DEFAULT_SHUL_SLUG` fallback.
- **Everything scoped** — households (family link slugs are unique *per
  shul*, so two shuls can both have `/c/gofman`), suggestions, raffle draws,
  stats, emails, WhatsApp blast texts, CSV export, admin auth.
- **`/platform`** — the platform admin (you) creates and manages shuls:
  create form seeds the standard commitment list; edit form manages dates,
  domains, logos, active flag, and admin-password resets.
- **Crons** — the same two Vercel crons now sweep every active shul.
- **Per-shul admin isolation** — each shul's `/admin` password only opens
  that shul's admin; cookies from one tenant are worthless at another.

## New environment variables

| Var | Purpose | Example |
| --- | --- | --- |
| `PLATFORM_ADMIN_PASSWORD` | opens `/platform` | strong secret |
| `NEXT_PUBLIC_ROOT_DOMAIN` | the wildcard parent domain | `theelulshabbosproject.com` |
| `DEFAULT_SHUL_SLUG` | tenant for the bare root domain / previews | `adas` |

(`ADMIN_PASSWORD` is retired — passwords live per-shul in the DB. All other
vars — `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` — are
unchanged.)

## Cutover plan (after Shabbos Shuva — NOT during the live campaign)

1. **Snapshot**: Neon console → Branches → create a branch of production
   (instant restore point).
2. **Migrate data**: compute the Adas admin hash
   (`echo -n 'elul:adas:YOURPASSWORD' | sha256sum`), paste it into
   `deploy/V2-MIGRATION.sql`, and run that file in the Neon SQL Editor.
   It creates the Shul table, makes Adas tenant #1, and rewires every
   existing family/check-in/raffle to it. Nothing is deleted.
3. **Domains**: in Vercel → adas-shabbos → Settings → Domains, add
   `theelulshabbosproject.com` and the wildcard `*.theelulshabbosproject.com`
   (wildcards require pointing that domain's nameservers at Vercel — Vercel
   shows the two NS records to set at GoDaddy). Keep shabboswithadas.com
   exactly as it is (change its earlier redirect to point at the project
   directly, not a redirect, since it's Adas's custom domain).
4. **Env vars**: add the three new vars above; remove `ADMIN_PASSWORD`,
   `NEXT_PUBLIC_SHUL_NAME`/`PARTNER`/`CITY`, `CAMPAIGN_SHABBOS_DATES`,
   `CAMPAIGN_TZ_OFFSET`, `CAMPAIGN_TIMEZONE` (all superseded by the DB).
5. **Ship code**: merge `claude/elul-v2-multitenant` into the production
   branch (or point Vercel's production branch at it). Vercel deploys;
   shabboswithadas.com now resolves as the Adas tenant with identical data.
6. **Verify**: shabboswithadas.com renders as before; `/platform` opens with
   the platform password; create a test shul, check its subdomain, delete it.

## Onboarding a shul (after cutover)

`/platform` → Add a shul → fill six fields → done. Send their admin the URL
(`slug.theelulshabbosproject.com`), their admin password, and the flyer
templates. Their logo: they email you a PNG; you upload it somewhere public
(or commit to `/public/<slug>-logo.png`) and paste the path in their shul's
platform entry.

## Costs (you become the platform operator)

- Vercel + Neon: free tiers hold for several small shuls; Vercel Pro
  ($20/mo) once traffic/cron volume grows.
- **Resend is the real cost center**: every shul's reminders come from your
  account. Pro ($20/mo, 50k emails/month) covers roughly 15–25 active shuls
  of ~100 families through a 4-week campaign. Worth asking shuls for a small
  contribution once there are more than a handful.

## Testing done on this branch

Two-tenant end-to-end on a local build: platform-created second shul with
its own 24-item catalog; same family name + email signed up at both shuls
without collision (`/c/klein` renders a different family per host);
tenant-scoped /find; cross-tenant check-in rejected (404); adas-only family
404s on the other shul; admin cookie from one shul rejected at the other;
cron sweep iterates both shuls independently.
