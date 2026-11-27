# Don't Forget 📌

<div align="center">

### *“Think It. Save It. Never Forget It.”*

**A privacy-first memory capture and reminder app — type it in plain English, get reminded on time, even when the tab is closed.**

[**🚀 Live App**](https://dont-forget-mu-blue.vercel.app) • [Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Reminders Pipeline](#-how-reminders-actually-fire) • [Testing](#-testing)

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://dont-forget-mu-blue.vercel.app)

</div>

---

## Why this exists

Everything you have to remember is scattered: a library due date, a grocery list, a gift for a friend, a doctor's appointment, a link you'll "look at later". Note apps make you pick a category, a date, a time, a priority — before you've even written the thought down.

**Don't Forget** inverts that. You type one line the way you'd say it:

> `return the library book tomorrow at 6pm`
> `buy milk and eggs`
> `call mom next friday`
> `gift idea for ravi: mechanical keyboard, under 3000`

It detects the date, the time, and the category, and it saves immediately. If a reminder is attached, a server-side worker emails you at the right minute — you don't need the tab open, the browser running, or your laptop awake.

---

## ✨ Features

### 1. Natural-language instant capture
- **One input for everything** — a single bar at the top of the app captures tasks, reminders, links, ideas, books, gifts, places, and shopping items.
- **Date & time parsing** — understands `tomorrow`, `next monday`, `in 2 hours`, `this weekend`, `25/12 at 9am`, `6pm`, and more, with timezone-aware results.
- **Category inference** — `buy milk` becomes a shopping list, `gift idea for…` becomes a gift, `https://…` becomes a saved link, a bare date becomes a reminder.
- **Confirm, don't guess** — when the parsed time is ambiguous, the UI asks before scheduling instead of silently picking one.
- **Works offline-first** — if Supabase isn't configured, the app falls back to `localStorage` so it runs immediately after `npm install`.

### 2. Reminders that fire without the browser
- **Server-side scheduler** — `pg_cron` runs an Edge Function every minute, so reminders are delivered when the app is closed.
- **Transactional email via Resend**, with an HTML template containing the item, notes, and the scheduled time in the user's timezone.
- **Exactly-once delivery** — every `(memory, channel, scheduled_for)` is claimed in a `reminder_dispatch_logs` ledger *before* sending; a duplicate insert hits a unique constraint (`23505`) and the second attempt bails out. Cron overlaps and retries can never double-send.
- **Opt-out respected** — `profiles.email_notifications_enabled = false` is honoured per user.
- **Browser notifications + in-app inbox** for reminders due while the app is open.
- **Send Test Email** button in Settings verifies the whole chain end-to-end.

### 3. Purpose-built categories
| Category | What it stores |
|---|---|
| **Tasks** | Priority (low → urgent), due date, completion, archive |
| **Reminders** | Date + time + timezone, email/browser opt-in |
| **Shopping lists** | Multiple lists, items with quantity/unit/notes, bought toggles |
| **Library books** | Title, author, branch, return deadline |
| **Saved links** | URL, domain, personal notes |
| **Ideas** | Free-form captured thoughts |
| **Gift ideas** | Recipient, occasion, budget, purchased flag |
| **Places** | Location, visited flag |

Plus **favorites**, **archive**, **search**, **filters**, and **sorting** across all of them.

### 4. Security you can verify
- **Row Level Security on every table** — 18 policies, all anchored on `auth.uid()`; a logged-out client sees zero rows, and a signed-in user cannot read, update, or delete another user's data (verified by automated cross-tenant tests).
- **No client-supplied recipients** — the email function requires a valid user JWT and always sends to that user's own address, so it can't be used as an open relay.
- **Secrets stay server-side** — `RESEND_API_KEY`, the service role key, and the cron secret live only in Edge Function secrets and Supabase Vault. The browser gets the anon key, which is safe to publish.
- **RLS failures are surfaced**, not swallowed — the app shows the real database error instead of silently falling back to local storage.

### 5. UX
- Light/dark mode with system detection, Plus Jakarta Sans typography, keyboard-friendly flows, responsive from 360 px up.

---

## 🏗 Architecture

```
Browser (React 18 + Vite + Tailwind)
   │  anon key + user JWT
   ▼
Supabase
   ├─ Auth          email/password, email confirmation, password recovery
   ├─ Postgres      profiles, memories, shopping_lists, shopping_items,
   │                reminder_dispatch_logs  (RLS on all five)
   ├─ Realtime      WAL changes → live sync across tabs/devices
   ├─ Edge Function  send-reminder-email      (user JWT → own address)
   └─ Edge Function  check-scheduled-reminders (service role / cron secret)
            ▲
            │ every minute
        pg_cron + pg_net  ──reads Vault secrets──▶  HTTP POST
            │
            ▼
        Resend  ──▶  user's inbox
```

**Repository layout**

```
├── src/
│   ├── components/        Layout, QuickSaveBar, MemoryCard, …
│   ├── context/           AuthContext, MemoryContext, ThemeContext
│   ├── lib/
│   │   ├── supabase.ts            client + config validation
│   │   ├── nlpParser.ts           natural-language date/category parser
│   │   ├── reminderScheduler.ts   in-app/browser dispatch + test email
│   │   └── localStore.ts          offline fallback
│   ├── pages/             Landing, Auth, Dashboard, Shopping, Search,
│   │                      Settings, ResetPassword/AuthCallback
│   └── types/             domain models
├── supabase/
│   ├── schema.sql         idempotent schema: tables, RLS, triggers, realtime
│   ├── cron_setup.sql     pg_cron + pg_net minute job using Vault secrets
│   └── functions/         the two Edge Functions
├── scripts/e2e-supabase.mjs   end-to-end database test suite
├── SUPABASE_SETUP.md      production setup + go-live checklist
└── vercel.json            SPA rewrites for client-side routing
```

---

## 🚀 Quick start

```bash
git clone https://github.com/santhoshdayalan753-creator/Don-t-Forget.git
cd Don-t-Forget
npm install
cp .env.example .env      # optional: without it, the app runs offline-only
npm run dev               # http://localhost:5173
```

### Environment variables

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon or publishable key>
VITE_NOTIFICATION_WEBHOOK_URL=https://<project-ref>.supabase.co/functions/v1/send-reminder-email
```

GA4 is not configured through env vars — set the measurement ID in the gtag.js snippet in [`index.html`](index.html), which is the single source of truth for both the tag and the app's events.

Only `VITE_*` values reach the browser. **Never** put a service role key, Resend key, or access token behind a `VITE_` prefix.

### Database

Paste [`supabase/schema.sql`](supabase/schema.sql) into **Supabase → SQL Editor** and run it. It is idempotent — safe to re-run, and it only creates/repairs objects (never drops data). It creates the five tables, RLS policies, `updated_at` triggers, the profile-on-signup trigger, indexes, and adds the tables to the realtime publication.

Then, for emailed reminders, follow [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md#5-edge-functions-required-for-emailed-reminders): deploy the two functions, set secrets, store the Vault keys, and run [`supabase/cron_setup.sql`](supabase/cron_setup.sql).

---

## ⏰ How reminders actually fire

1. You save an item with `due_date` and `reminder_enabled`.
2. `pg_cron` calls `check-scheduled-reminders` every minute (`* * * * *`).
3. The worker selects due reminders within a **24-hour lookback window** (older ones are stale and skipped).
4. For each one it **inserts a ledger row first** (`channel = 'email'`, `status = 'retrying'`). A unique violation means another run already handled it → skip.
5. It resolves the recipient from `profiles.email`, falling back to the auth record, and respects `email_notifications_enabled`.
6. Resend sends the email; the ledger row is updated to `delivered`, `failed`, or `skipped` with the reason stored in `response_payload`.

Inspect it any time:

```sql
select channel, status, count(*) from public.reminder_dispatch_logs group by 1, 2;
select status_code, created from net._http_response order by created desc limit 5; -- expect 200
select jobname, schedule, active from cron.job;
```

---

## 🧪 Testing

A real end-to-end suite runs against your Supabase project using the same API the browser uses.

```bash
npm run test:e2e:preflight   # connectivity + schema only, writes nothing
npm run test:e2e             # full suite (needs SUPABASE_SERVICE_ROLE_KEY for cleanup)
```

It covers **31 checks**: authentication and wrong-password rejection, the profile trigger, `updated_at` triggers, CRUD across all nine memory categories, jsonb/flag updates, filters and ordering, the priority CHECK constraint, shopping items + cascade delete, the dispatch ledger's `23505` idempotency, cascade from memory to logs, anonymous read/insert blocking, spoofed `user_id` rejection, **cross-user isolation**, and **realtime delivery**. It creates disposable users and deletes them afterwards.

Add `SUPABASE_SERVICE_ROLE_KEY` to your shell (never to `.env.example`, never to Vercel) to let it pre-confirm test users and clean up.

---

## ☁️ Deployment

The app is deployed on Vercel from this repository (`main` → production).

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |
| Node version | 20.x |

`vercel.json` rewrites every path to `index.html`, so deep links such as `/dashboard`, `/settings`, `/reset-password`, and `/auth/callback` survive a hard refresh.

Set the same three env vars in **Vercel → Settings → Environment Variables**, then redeploy — `VITE_*` values are inlined at build time, so changing them requires a new build.

Finally, add your domain to **Supabase → Authentication → URL Configuration** (Site URL plus `/auth/callback` and `/reset-password` redirect URLs), otherwise email links point at the wrong host.

---

## 🛠 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` typecheck + optimized production build |
| `npm run preview` | Serve the production build locally |
| `npm run test:e2e` | Full database E2E suite |
| `npm run test:e2e:preflight` | Connectivity + schema check, no writes |

---

## 🩺 Troubleshooting

| Symptom | Fix |
|---|---|
| Data vanishes on refresh | Build has no Supabase env vars → app is in offline mode. Set them and rebuild. |
| `ENOTFOUND <ref>.supabase.co` | Project deleted/paused or wrong URL |
| `PGRST205` / table does not exist | Run `supabase/schema.sql` |
| `42501` on insert | Inserting a row whose `user_id` isn't the signed-in user |
| "Email rate limit exceeded" | Built-in SMTP is throttled — configure custom SMTP or disable email confirmation |
| Reset link invalid/expired | Link already used, or host missing from Supabase redirect URLs |
| Cron runs, no email | `RESEND_API_KEY` unset (ledger shows `skipped`), unverified sender domain, or user opted out |
| Realtime doesn't update | `memories` missing from the `supabase_realtime` publication — re-run `schema.sql` |

More detail, including verification queries and a go-live checklist: [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

---

## 🤝 Contributing

1. Fork and branch: `git checkout -b feature/your-feature`
2. Keep `npm run build` and `npm run test:e2e` green
3. Open a PR describing the behaviour change and how you verified it

Bug reports with reproduction steps and screenshots are very welcome.

---

## 📄 License

MIT. See <https://opensource.org/license/mit> for the full text.

<div align="center">
  <sub>Built for people who think of things at the worst possible moment. “Think It. Save It. Never Forget It.”</sub>
</div>
