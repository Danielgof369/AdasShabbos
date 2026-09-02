# Support: how a shul gets changes made

Shul admins run their own campaign from `/admin` — reminders, custom
messages, the commitment list, dates, logos, pledge/raffle settings,
resources, announcements, password. When they need something the admin page
can't do (a custom domain, a new counter, different email wording, a
feature), they use the **"Need something that isn't here?"** form at the
bottom of `/admin`, or email **support@kabbolasshabbos.com** directly.

## The pipeline

```
shul admin  ──/admin form or email──▶  support@kabbolasshabbos.com
                                             │ (GoDaddy forwarding)
                                             ▼
                                   daniel@gflowsystems.com
                                             │ hourly Routine (Claude Code, Gmail connector)
                                             ▼
        ┌──────────────────────────────────────────────────────────────┐
        │ 1. search: to:support@kabbolasshabbos.com -label:KSI-Handled  │
        │ 2. per email: classify                                        │
        │    • can do it themselves → draft reply pointing to the exact │
        │      /admin section                                           │
        │    • needs code → branch off the production branch, make the  │
        │      change, build, push, open a PR, draft a reply            │
        │    • needs the operator (domain in Vercel, DNS, billing,      │
        │      DB edit) → draft a reply + leave a note for Daniel       │
        │ 3. label the email KSI-Handled                                │
        └──────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
                     Daniel: merge the PR (Vercel deploys), send the drafts
```

Nothing is sent to a shul automatically: replies are **Gmail drafts** and code
lands as a **pull request**. Flip both to automatic later by editing the
Routine's prompt once the pipeline has earned trust.

## One-time setup (Daniel)

1. **Mailbox**: GoDaddy → Email & Office → Email Forwarding → create
   `support@kabbolasshabbos.com` → forward to `daniel@gflowsystems.com`.
   (Free with the domain. A Google Workspace mailbox works too.)
2. **Resend**: `EMAIL_REPLY_TO=support@kabbolasshabbos.com` and
   `PLATFORM_CONTACT_EMAIL=support@kabbolasshabbos.com` in Vercel, so every
   platform email invites replies to the support address.
3. **Gmail label** `KSI-Handled`: the Routine creates it on its first run.
   No filter is needed — the Routine searches by recipient.
4. **Routine** "KSI support inbox" (id `trig_01KoXSmd6HipJ1kyxKeMw9CD`) —
   hourly, fresh session. It exists but is **disabled** until the Gmail
   connector is attached, which can only be done from claude.ai/code →
   Routines: open it, add the Gmail connector, then enable it. To change
   its behavior, edit its prompt there.

## What the Routine is told

- Production branch: **`claude/kabbalas-shabbos`** (update this line and the
  Routine prompt at cutover if the branch changes).
- Base every change on that branch; name the branch
  `support/<slug>-<short-description>`; run `npx tsc --noEmit` and
  `npm run build` before pushing; open a PR titled `[support] <shul>: <what>`
  with the requester's email quoted in the body.
- Never push to the production branch directly. Never touch secrets or
  another shul's data. Never send email; only drafts.
- Reply drafts: warm, short, in the requester's language; say what was done
  or when it will land; sign as Kabbolas Shabbos.

## Escalations the agent can't do

Custom domains (Vercel + DNS), Resend domain verification, billing, and any
direct database edit. The Routine leaves those as a draft reply plus a
"needs Daniel" note in the thread, and Daniel does them by hand (see
`deploy/PLATFORM.md`).
