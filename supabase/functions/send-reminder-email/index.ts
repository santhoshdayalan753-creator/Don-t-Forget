// Edge Function: send-reminder-email
// Deploy to Supabase Edge Functions with `supabase functions deploy send-reminder-email`
// Requires RESEND_API_KEY environment variable in Supabase Secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "reminders@dontforget.app";

interface EmailReminderPayload {
  toEmail: string;
  userName?: string;
  reminderTitle: string;
  description?: string;
  category?: string;
  scheduledTime: string;
  timezone?: string;
}

serve(async (req: Request) => {
  // CORS Headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const payload: EmailReminderPayload = await req.json();

    if (!payload.toEmail || !payload.reminderTitle) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set. Simulating successful acceptance for test.");
      return new Response(
        JSON.stringify({
          success: true,
          simulated: true,
          message: "Email reminder accepted (Resend API key missing in environment)",
          payload,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Professional HTML Email Template
    const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 18px; color: #4f46e5; margin-bottom: 24px; }
          .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          .card { background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; border-left: 4px solid #4f46e5; }
          .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em; }
          .value { font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 4px; }
          .tagline { color: #64748b; font-size: 13px; font-style: italic; margin-top: 24px; text-align: center; }
          .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">
            📌 Don't Forget
          </div>

          <h2 class="title">Reminder: ${payload.reminderTitle}</h2>
          <p>Hello ${payload.userName || "there"},</p>
          <p>This is your scheduled reminder from <strong>Don't Forget</strong>.</p>

          <div class="card">
            <div class="label">Reminder</div>
            <div class="value">${payload.reminderTitle}</div>

            <div style="margin-top: 12px;" class="label">Scheduled Date & Time</div>
            <div class="value">${payload.scheduledTime} (${payload.timezone || "Asia/Kolkata"})</div>

            ${payload.description ? `
              <div style="margin-top: 12px;" class="label">Description / Notes</div>
              <div class="value" style="font-weight: 400; font-size: 14px;">${payload.description}</div>
            ` : ""}
          </div>

          <p class="tagline">“Think It. Save It. Never Forget It.”</p>
          <div class="footer">
            Sent by Don't Forget Reminders Service • Never miss what matters most.
          </div>
        </div>
      </body>
    </html>
    `;

    // Call Resend Transactional Email API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [payload.toEmail],
        subject: `Reminder — ${payload.reminderTitle}`,
        html: htmlBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.id,
        deliveredTo: payload.toEmail,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
