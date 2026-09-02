# A live demo before the domain (Vercel + Neon, ~10 minutes)

Make a second Vercel project from the same repo, pointed at the platform
branch, with its own empty Neon database. The build seeds it with sample
shuls and families, so you get a real, clickable site at a `*.vercel.app`
address without touching Adas or the domain. When the domain is ready you
attach it to this same project — the demo *becomes* production.

## 1. Neon: a database for the demo
Neon console → **New project** → name `kabalos-shabbos` → region US East →
Create. Copy the **pooled** connection string (Connection details → check
"Pooled connection") — it starts with `postgresql://` and contains `-pooler`.

## 2. Vercel: a second project
Vercel → **Add New → Project** → import `Danielgof369/AdasShabbos` (it is
already connected) → Project name **`kabalos-shabbos`**.
- Framework: Next.js (auto). Build command: leave default — `vercel.json` sets it.
- **Environment variables** (all environments):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the pooled Neon string from step 1 |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `kabalos-shabbos.vercel.app` (the project's default domain) |
| `PLATFORM_ADMIN_PASSWORD` | anything strong — opens `/platform` |
| `AUTH_SECRET` | 32+ random characters |
| `CRON_SECRET` | 32+ random characters |
| `DB_SETUP_ON_BUILD` | `1` |
| `SEED_DEMO` | `1` |
| `SEED_ADMIN_PASSWORD` | anything — the demo Adas shul's admin password |
| `PLATFORM_NOTIFY_EMAIL` | your email (optional) |

Do **not** add `RESEND_API_KEY` yet: without it every email is logged
instead of sent, which is what you want on a demo.

- Deploy. The first build takes ~2 minutes (it pushes the schema and seeds).
- Then Settings → Git → **Production Branch** → `claude/kabbalas-shabbos` →
  Save, and redeploy once from the Deployments tab so the URL serves that branch.

## 3. Click around
`https://kabalos-shabbos.vercel.app` — national landing, `/join` (pick a
shul or add one), a shul's page under `/s/…`, family links under `/c/…`,
`/shuls`, `/platform` (your password), `/start`. Sign up a real test family:
reminders won't send (no Resend key) but everything else is live.

Subdomain sites (`adas.…`) don't resolve on a `vercel.app` address; they
work once the real domain and wildcard are attached.

## 4. Turning the demo into production later
1. Remove `DB_SETUP_ON_BUILD` and `SEED_DEMO`; delete the sample shuls at
   `/platform` (or reset the Neon database and run `deploy/PLATFORM-MIGRATION.sql`
   to bring the Adas data over — see `deploy/PLATFORM.md`).
2. Add the domain and wildcard, Resend key, and the rest of the env vars
   from `deploy/PLATFORM.md`.
