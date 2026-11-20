// Edge Function: send-reminder-email
// Sends a single transactional reminder email through Resend.
//
// Security: requires a valid Supabase user JWT (`Authorization: Bearer <access_token>`)
// and always delivers to the *authenticated user's* address. The client cannot
// choose an arbitrary recipient, so this endpoint cannot be abused as an open
// email relay.
//
// Deploy:  supabase functions deploy send-reminder-email
// Secrets: supabase secrets set RESEND_API_KEY=... SENDER_EMAIL="Don't Forget <reminders@yourdomain.com>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Public key used to validate the caller's JWT. Accepts the platform-injected
// name or our own secret for newer projects that only expose new-style keys.
const SUPABASE_ANON_KEY =
  Deno.env.get("ANON_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "Don't Forget <onboarding@resend.dev>";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

interface EmailReminderPayload {
  reminderTitle?: string;
  description?: string;
  category?: string;
  scheduledTime?: string;
  timezone?: string;
}

function buildHtml(name: string, payload: EmailReminderPayload) {
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
  <h2 class="title">Reminder: ${escapeHtml(payload.reminderTitle)}</h2>
  <p>Hello ${escapeHtml(name)},</p>
  <p>This is your scheduled reminder from <strong>Don't Forget</strong>.</p>
  <div class="card">
    <div class="label">Reminder</div>
    <div class="value">${escapeHtml(payload.reminderTitle)}</div>
    <div class="label" style="margin-top:12px">Scheduled Date &amp; Time</div>
    <div class="value">${escapeHtml(payload.scheduledTime)} (${escapeHtml(payload.timezone || "UTC")})</div>
    ${payload.description ? `<div class="label" style="margin-top:12px">Notes</div>
    <div class="value" style="font-weight:400;font-size:14px">${escapeHtml(payload.description)}</div>` : ""}
  </div>
  <p class="tagline">“Think It. Save It. Never Forget It.”</p>
  <div class="footer">Sent by Don't Forget Reminders Service.</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Missing bearer token" }, 401);
  }

  // Validate the JWT and resolve the recipient from it.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user?.email) {
    return json({ error: "Invalid or expired session" }, 401);
  }

  let payload: EmailReminderPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!payload.reminderTitle) {
    return json({ error: "Missing required field: reminderTitle" }, 400);
  }

  if (!RESEND_API_KEY) {
    // Structured, user-facing failure: the client renders `error` directly, so it
    // must never contain shell commands or secret names.
    return json({
      success: false,
      simulated: true,
      code: "email_not_configured",
      error:
        "Email delivery is not configured for this project yet. Reminders still arrive in-app and as browser notifications.",
    }, 503);
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.full_name ?? user.user_metadata?.full_name ?? "there";
  const scheduledTime = payload.scheduledTime ?? new Date().toLocaleString();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [user.email], // never trust a client-supplied recipient
        subject: `Reminder — ${payload.reminderTitle}`,
        html: buildHtml(name, { ...payload, scheduledTime }),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      // Bad/expired provider credentials: report it without echoing key material.
      console.error("resend auth rejected", data?.message ?? res.status);
      return json({
        success: false,
        code: "email_provider_rejected",
        error: "The email provider rejected the configured credentials.",
      }, 502);
    }
    if (!res.ok) return json({ error: data?.message ?? "Email provider rejected the request" }, res.status);

    return json({ success: true, messageId: data?.id ?? null, deliveredTo: user.email });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
