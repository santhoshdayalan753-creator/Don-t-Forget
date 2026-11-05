// Edge Function: check-scheduled-reminders
// Triggered every minute via pg_cron or external cron runner
// Runs the server-side idempotency check, sends emails, and logs delivery

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "reminders@dontforget.app";

serve(async (req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    // 1. Query all memories whose due_date <= now, reminder_enabled = true, is_completed = false, is_archived = false
    const { data: dueMemories, error: memoriesError } = await supabase
      .from("memories")
      .select("id, user_id, title, content, category, due_date, timezone, reminder_enabled")
      .eq("reminder_enabled", true)
      .eq("is_completed", false)
      .eq("is_archived", false)
      .lte("due_date", now.toISOString());

    if (memoriesError) throw memoriesError;
    if (!dueMemories || dueMemories.length === 0) {
      return new Response(JSON.stringify({ checked: 0, dispatched: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let dispatchedCount = 0;

    for (const item of dueMemories) {
      // 2. Check if already dispatched (Idempotency)
      const { data: existingLog } = await supabase
        .from("reminder_dispatch_logs")
        .select("id")
        .eq("memory_id", item.id)
        .eq("channel", "email")
        .eq("scheduled_for", item.due_date)
        .maybeSingle();

      if (existingLog) {
        continue; // Already processed
      }

      // 3. Get user's verified email from auth or profiles
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("email, full_name, email_notifications_enabled")
        .eq("id", item.user_id)
        .maybeSingle();

      const recipientEmail = userProfile?.email;
      if (!recipientEmail) continue;

      // 4. Send email via Resend if API key configured
      let deliveryStatus = "delivered";
      let resendMessageId = null;

      if (RESEND_API_KEY) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [recipientEmail],
            subject: `Reminder — ${item.title}`,
            html: `
              <h2>Reminder from Don't Forget</h2>
              <p>Hello ${userProfile?.full_name || "there"},</p>
              <p>This is your reminder for: <strong>${item.title}</strong></p>
              <p>Due Time: ${new Date(item.due_date).toLocaleString("en-US", { timeZone: item.timezone || "Asia/Kolkata" })}</p>
              ${item.content ? `<p>Notes: ${item.content}</p>` : ""}
              <p>“Think It. Save It. Never Forget It.”</p>
            `,
          }),
        });

        const resData = await emailResponse.json();
        if (emailResponse.ok) {
          resendMessageId = resData.id;
        } else {
          deliveryStatus = "failed";
        }
      }

      // 5. Insert Dispatch Log for Audit & Idempotency
      await supabase.from("reminder_dispatch_logs").insert([
        {
          memory_id: item.id,
          user_id: item.user_id,
          channel: "email",
          scheduled_for: item.due_date,
          status: deliveryStatus,
          response_payload: { messageId: resendMessageId, recipient: recipientEmail },
        },
      ]);

      dispatchedCount++;
    }

    return new Response(JSON.stringify({ checked: dueMemories.length, dispatched: dispatchedCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
