// Edge Function: check-scheduled-reminders
// Triggered every minute by pg_cron (supabase/cron_setup.sql).
// Sends due reminder emails via Resend and writes an idempotency row to
// public.reminder_dispatch_logs so a reminder is never delivered twice.
//
// Required secrets:
//   RESEND_API_KEY                      Resend API key
//   SENDER_EMAIL                        e.g. "Don't Forget <reminders@yourdomain.com>"
//   CRON_SECRET (optional)              extra shared secret for non-cron callers
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by Supabase automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// The platform normally injects SUPABASE_SERVICE_ROLE_KEY, but newer projects
// may expose the new-style key instead. SERVICE_ROLE_KEY is our own secret so
// DB writes always have a usable key.
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PROJECT_REF = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "Don't Forget <onboarding@resend.dev>";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function jwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// Cron authenticates with the service role key. The request only reaches this
// code after Supabase's gateway verified the JWT signature (verify_jwt = true),
// so the `role` claim can be trusted. We do not rely on the key being present
// under a specific env var name.
function isServiceRoleToken(token: string): boolean {
  if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) return true;
  const payload = jwtPayload(token);
  if (!payload || payload.role !== "service_role") return false;
  if (typeof payload.ref === "string" && payload.ref !== PROJECT_REF) return false;
  return true;
}

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (bearer && isServiceRoleToken(bearer)) return true;
  if (CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET) return true;
  return false;
}

function reminderHtml(item: { title: string; content?: string | null; due_date: string; timezone?: string | null }, name: string) {
  const due = new Date(item.due_date).toLocaleString("en-US", {
    timeZone: item.timezone || "UTC",
    dateStyle: "full",
    timeStyle: "short",
  });
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;color:#1e293b;margin:0;padding:24px}
  .container{max-width:540px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:32px}
  .brand{font-weight:800;font-size:18px;color:#4f46e5;margin-bottom:24px}
  .title{font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px}
  .card{background:#f1f5f9;border-radius:12px;padding:18px;margin:20px 0;border-left:4px solid #4f46e5}
  .label{font-size:11px;text-transform:uppercase;font-weight:700;color:#64748b;letter-spacing:.05em}
  .value{font-size:15px;font-weight:600;color:#1e293b;margin-top:4px}
  .tagline{color:#64748b;font-size:13px;font-style:italic;margin-top:24px;text-align:center}
  .footer{font-size:11px;color:#94a3b8;text-align:center;margin-top:16px;border-top:1px solid #f1f5f9;padding-top:16px}
</style></head>
<body><div class="container">
  <div class="brand">📌 Don't Forget</div>
  <h2 class="title">Reminder: ${escapeHtml(item.title)}</h2>
  <p>Hello ${escapeHtml(name)},</p>
  <p>This is your scheduled reminder from <strong>Don't Forget</strong>.</p>
  <div class="card">
    <div class="label">Reminder</div>
    <div class="value">${escapeHtml(item.title)}</div>
    <div class="label" style="margin-top:12px">Scheduled for</div>
    <div class="value">${escapeHtml(due)} (${escapeHtml(item.timezone || "UTC")})</div>
    ${item.content ? `<div class="label" style="margin-top:12px">Notes</div>
    <div class="value" style="font-weight:400;font-size:14px">${escapeHtml(item.content)}</div>` : ""}
  </div>
  <p class="tagline">“Think It. Save It. Never Forget It.”</p>
  <div class="footer">Sent by the Don't Forget reminder service.</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);
  if (!SERVICE_ROLE_KEY) return json({ error: "SERVICE_ROLE_KEY secret is not configured" }, 503);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const nowIso = new Date().toISOString();
    // Only look back 24h: older reminders are stale and should not be emailed.
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: dueMemories, error: memoriesError } = await supabase
      .from("memories")
      .select("id,user_id,title,content,category,due_date,timezone,reminder_enabled")
      .eq("reminder_enabled", true)
      .eq("is_completed", false)
      .eq("is_archived", false)
      .not("due_date", "is", null)
      .lte("due_date", nowIso)
      .gte("due_date", windowStart)
      .order("due_date", { ascending: true })
      .limit(200);

    if (memoriesError) return json({ error: memoriesError.message }, 500);
    if (!dueMemories?.length) return json({ checked: 0, dispatched: 0 });

    let dispatched = 0;
    let skipped = 0;

    for (const item of dueMemories) {
      // --- Idempotency: claim the (memory, channel, schedule) slot first.
      const { data: claim, error: claimError } = await supabase
        .from("reminder_dispatch_logs")
        .insert([{
          memory_id: item.id,
          user_id: item.user_id,
          channel: "email",
          scheduled_for: item.due_date,
          status: "retrying",
          response_payload: { source: "check-scheduled-reminders" },
        }])
        .select("id")
        .single();

      // 23505 = unique violation -> another run already delivered it.
      if (claimError) {
        if (claimError.code === "23505") { skipped++; continue; }
        console.error("dispatch claim failed", claimError.message);
        continue;
      }

      // --- Resolve the recipient (profiles first, auth as fallback).
      const { data: profile } = await supabase
        .from("profiles")
        .select("email,full_name,email_notifications_enabled")
        .eq("id", item.user_id)
        .maybeSingle();

      let recipientEmail = profile?.email ?? null;
      if (!recipientEmail) {
        const { data: authUser } = await supabase.auth.admin.getUserById(item.user_id);
        recipientEmail = authUser?.user?.email ?? null;
      }

      const finish = async (status: string, extra: Record<string, unknown>) => {
        await supabase
          .from("reminder_dispatch_logs")
          .update({ status, response_payload: extra })
          .eq("id", claim.id);
      };

      if (!recipientEmail || profile?.email_notifications_enabled === false) {
        await finish("skipped", { reason: recipientEmail ? "user_disabled_email" : "no_recipient_email" });
        skipped++;
        continue;
      }

      if (!RESEND_API_KEY) {
        await finish("skipped", { reason: "RESEND_API_KEY not configured", recipient: recipientEmail });
        skipped++;
        continue;
      }

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [recipientEmail],
            subject: `Reminder — ${item.title}`,
            html: reminderHtml(item, profile?.full_name ?? "there"),
          }),
        });
        const payload = await res.json().catch(() => ({}));

        if (res.ok) {
          await finish("delivered", { messageId: payload?.id ?? null, recipient: recipientEmail });
          dispatched++;
        } else {
          await finish("failed", { status: res.status, error: payload, recipient: recipientEmail });
        }
      } catch (err) {
        await finish("failed", { error: String(err), recipient: recipientEmail });
      }
    }

    return json({ checked: dueMemories.length, dispatched, skipped });
  } catch (err) {
    console.error("check-scheduled-reminders crashed", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
