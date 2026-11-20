# Supabase production setup — Don't Forget

Everything the app needs from Supabase, in the order you should do it.
The code is already wired to this schema; this file is the operational checklist.

> **Status of the connected project — `ljktwumbpcmgwrpdogny`**
>
> - `.env` points at this project (URL, anon key, test-email webhook URL).
> - Schema applied via the Management API; **verified**: `npm run test:e2e` → **31 passed,
>   0 failed, 0 skipped** (auth, triggers, CRUD, RLS isolation, cascades, idempotency, realtime).
> - Both edge functions **deployed**; `pg_cron` + `pg_net` enabled; job
>   `process-scheduled-reminders-every-minute` runs every minute and returns HTTP 200.
>   Verified end-to-end: a due reminder produced a `reminder_dispatch_logs` row.
> - Vault secrets `project_url` / `service_role_key` created; function secrets
>   `CRON_SECRET`, `SERVICE_ROLE_KEY`, `ANON_KEY` set.
> - Function secrets `RESEND_API_KEY` + `SENDER_EMAIL` (`onboarding@resend.dev`)
>   are set. Verified live: a due reminder went through `pg_cron` → worker → Resend
>   and the ledger recorded `status = delivered` with a provider message id.
>   Without a verified domain, Resend only delivers to the account owner's inbox.
> - `profiles.email_notifications_enabled` defaults to **true** (opt-out) and the
>   Settings toggle persists it, so the worker no longer skips users with
>   `user_disabled_email`.
> - **Still open:** custom SMTP, and tightening the `https://*.vercel.app/**`
>   redirect wildcard once a custom domain exists.
> - Email confirmation is **ON**, so new signups must verify before signing in.
>
> The SQL in this repo is idempotent, so re-running it only creates/repairs objects —
> it never drops tables or deletes data.

---

## 0. What you need

| Item | Where to get it | Used by |
|---|---|---|
| Project URL (`https://<ref>.supabase.co`) | Project Settings → API | browser + edge functions |
| Anon / publishable key | Project Settings → API | browser (safe to expose) |
| Service role key (**secret**) | Project Settings → API | edge functions + cron + E2E cleanup |
| Database password | Project Settings → Database (only for `psql`) | optional CLI work |
| Resend API key | resend.com → API Keys | reminder emails |
| Verified sender address | Resend → Domains | reminder emails |
| GitHub repo (for Vercel) | your account | deployment |
| Vercel project | vercel.com | hosting |

Never put the service role key in a `VITE_*` variable — every `VITE_*` value is
compiled into the public JavaScript bundle.

---

## 1. Create the project

1. supabase.com → **New project** → pick an organisation, name, region, DB password.
2. Wait for provisioning, then copy from **Project Settings → API**:
   - Project URL
   - `anon` / publishable key
   - `service_role` key (keep it out of git)

The database starts empty. The app's tables do not exist until step 2.

---

## 2. Apply the schema (required)

Supabase Dashboard → **SQL Editor** → New query → paste the whole of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**.

It creates and is safe to re-run:

| Object | Purpose |
|---|---|
| `public.profiles` | one row per auth user, preferences, timezone |
| `public.memories` | all saved items (task/reminder/book/gift/place/link/idea/shopping/general) |
| `public.shopping_lists` | shopping list headers |
| `public.shopping_items` | list rows (FK → list, `ON DELETE CASCADE`) |
| `public.reminder_dispatch_logs` | idempotency ledger, `unique(memory_id, channel, scheduled_for)` |
| RLS policies | 4 per user-owned table, `auth.uid() = user_id` / `= id` |
| `handle_new_user()` trigger | creates the profile row on signup, keeps email in sync |
| `set_updated_at()` triggers | maintains `updated_at` on all four tables |
| indexes | user/category/due-date/reminder + list lookups |
| realtime publication | `memories`, `shopping_lists`, `shopping_items` |

Verify after running (SQL Editor):

```sql
select relname, relrowsecurity from pg_class
 where relnamespace = 'public'::regnamespace and relkind = 'r';

select tablename, policyname, cmd from pg_policies
 where schemaname = 'public' order by 1, 2;

select tablename from pg_publication_tables where pubname = 'supabase_realtime';
```

Expected: 5 tables with `relrowsecurity = true`, 18 policies, 3 realtime tables.

---

## 3. Authentication settings (required)

Authentication → **URL Configuration**:

- **Site URL**: `https://your-production-domain.vercel.app`
- **Redirect URLs** (add all of them):
  - `https://your-production-domain.vercel.app/auth/callback`
  - `https://your-production-domain.vercel.app/reset-password`
  - `http://127.0.0.1:5173/auth/callback`
  - `http://localhost:5173/auth/callback`
  - `http://127.0.0.1:5173/reset-password`
  - `http://localhost:5173/reset-password`

Authentication → **Sign In / Providers → Email**:

- **Confirm email**: ON for production (users must verify).
  - If ON, `signup()` returns no session and the app shows "Verification email sent!".
  - If OFF, users are signed in immediately — convenient for demos and for running
    the E2E suite without a service role key.
- **Minimum password length**: 6 (matches the UI validation).

Authentication → **Emails** (production):

- The built-in SMTP is heavily rate limited (a few messages per hour) and only
  intended for testing. Add custom SMTP (Resend, Postmark, SES…) so confirmation
  and password-reset emails actually arrive.

Password reset flow: email link → `/reset-password` → `supabase.auth.updateUser({ password })`.
Email confirmation link → `/auth/callback` → session established → `/dashboard`.

---

## 4. Frontend environment variables

Local `.env`:

```env
VITE_SUPABASE_URL=https://YOUR-NEW-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY

# Optional but needed for the Settings → "Send Test Email" button
VITE_NOTIFICATION_WEBHOOK_URL=https://YOUR-NEW-PROJECT-REF.supabase.co/functions/v1/send-reminder-email

# Optional analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Vercel → Project → **Settings → Environment Variables** (Production + Preview):

| Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | public |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable key | public |
| `VITE_NOTIFICATION_WEBHOOK_URL` | `https://<ref>.supabase.co/functions/v1/send-reminder-email` | public |
| `VITE_GA_MEASUREMENT_ID` | `G-…` | optional |

Vercel only bakes `VITE_*` variables at build time: redeploy after changing them.
`vercel.json` already rewrites all routes to `index.html` so `/reset-password` and
`/auth/callback` work on refresh.

The app degrades to `localStorage` when the URL/key are missing, and `/settings`
shows the exact configuration error plus any live database error (RLS/network).

---

## 5. Edge functions (required for emailed reminders)

Install the CLI once: `npm i -g supabase`, then `supabase login` and
`supabase link --project-ref <ref>`.

```bash
supabase functions deploy send-reminder-email
supabase functions deploy check-scheduled-reminders

supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  SENDER_EMAIL="Don't Forget <reminders@yourdomain.com>" \
  CRON_SECRET=some-long-random-string
```

- `send-reminder-email` requires a **user JWT** and always sends to the
  authenticated user's address (no open relay).
- `check-scheduled-reminders` requires the **service role key** (or
  `x-cron-secret`); it claims each `(memory, channel, scheduled_for)` row in
  `reminder_dispatch_logs` before sending, so retries/cron overlaps cannot
  duplicate an email.
- Resend requires a verified domain for the `from` address. For quick testing,
  `onboarding@resend.dev` only delivers to your own Resend account email.

**No CLI?** Dashboard → Edge Functions → *Deploy a new function* → name it
`send-reminder-email` (or `check-scheduled-reminders`) → paste the contents of the
matching `supabase/functions/<name>/index.ts` → Deploy. Keep *Verify JWT* **on** for
both: the test-email call carries the user's JWT and the cron call carries the
service role JWT. Only turn it off for `check-scheduled-reminders` if you switch
cron to the `x-cron-secret` header instead of the service role key.

---

## 6. Cron (required for "email me even if the browser is closed")

SQL Editor, run once to store secrets server-side:

```sql
select vault.create_secret('https://YOUR-NEW-PROJECT-REF.supabase.co', 'project_url');
select vault.create_secret('YOUR-SERVICE-ROLE-KEY', 'service_role_key');
```

Then run [`supabase/cron_setup.sql`](supabase/cron_setup.sql). It schedules
`process-scheduled-reminders-every-minute` (`* * * * *`) with `pg_cron`, calling
the worker through `pg_net`.

Check it works:

```sql
select jobid, jobname, schedule, active from cron.job;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
select status_code, created from net._http_response order by created desc limit 5;
```

`status_code` should be `200`. A `401` means the stored service role key is wrong.

---

## 7. Run the database E2E suite

```bash
# connection + schema only (no writes)
npm run test:e2e:preflight

# full suite: auth, trigger, CRUD, RLS, cascade, constraints, realtime
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key npm run test:e2e
```

It reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `.env`, creates
disposable `e2e.*@example.com` users, and deletes everything it created (users
included, when the service role key is supplied). Run it against a staging
project rather than production with real users.

Coverage:

1. project reachable + key accepted
2. all 5 tables exist and block anonymous reads
3. signup / sign-in / wrong-password rejection
4. `profiles` auto-created by trigger, profile update, `updated_at` bump
5. memories: insert all 9 categories, select/filter/sort, update (jsonb + flags), delete, priority constraint
6. shopping lists/items: create, update, cascade delete
7. dispatch logs: insert, duplicate rejected with `23505`, cascade with the memory
8. RLS: anonymous read/insert blocked, spoofed `user_id` blocked, two-user isolation
9. realtime: UPDATE event delivered to a subscriber (skipped if unavailable)
10. cleanup

The script also prints whether email confirmation is enabled, so you know which
auth UX your users will see.

---

## 8. Go-live checklist

- [ ] `supabase/schema.sql` applied on the new project; verification queries pass
- [ ] Auth Site URL + all redirect URLs registered
- [ ] Custom SMTP configured (or "Confirm email" off for a demo)
- [x] Edge functions deployed; `RESEND_API_KEY` + `SENDER_EMAIL` set
- [ ] Vault secrets + `cron_setup.sql` applied; `net._http_response` shows 200
- [ ] Vercel env vars set and a fresh deploy made
- [ ] `npm run test:e2e:preflight` passes against the production project
- [ ] Signup → confirm → login → save item → reload (data persists) → logout
- [ ] Password reset email arrives and `/reset-password` works
- [ ] Create a reminder 2 minutes ahead, close the tab, confirm the email arrives
- [ ] Settings shows "Supabase RLS" and no database error

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ENOTFOUND <ref>.supabase.co` | project deleted/paused or wrong URL; copy it again from Project Settings → API |
| `PGRST205` / "Could not find the table" | schema not applied → run `supabase/schema.sql` |
| `401 Invalid API key` | wrong anon key, or using the service key in a `VITE_*` var |
| `42501 new row violates row-level security policy` | inserting a row whose `user_id` is not the signed-in user |
| Table returns rows to a logged-out client | RLS was disabled manually → re-run `schema.sql` |
| "Email rate limit exceeded" | default SMTP limits → configure custom SMTP, or turn off Confirm email |
| Reset link says invalid/expired | link already used or opened in another browser; request a new one; check redirect URLs |
| Test email button fails with 401 | not signed in, or `VITE_NOTIFICATION_WEBHOOK_URL` missing |
| Cron runs but nothing is sent | `RESEND_API_KEY` missing (logs show `status = skipped`), sender domain unverified, or `profiles.email_notifications_enabled = false` |
| Data appears then disappears on reload | browser is running a build without the Supabase env vars (localStorage fallback) |
| Realtime never fires | `memories` not in the `supabase_realtime` publication → re-run `schema.sql` |
