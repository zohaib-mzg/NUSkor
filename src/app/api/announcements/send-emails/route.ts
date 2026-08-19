import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "NUSkor <nuskor@resend.dev>";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    announcementId?: string;
  };
  const announcementId = body.announcementId;
  if (!announcementId) {
    return NextResponse.json({ error: "Missing announcementId" }, { status: 400 });
  }

  // Create pending delivery rows (validates the caller is the section's TA/admin).
  const prepRes = await supabase.rpc("prepare_email_deliveries", {
    p_announcement_id: announcementId,
  });
  if (prepRes.error) {
    return NextResponse.json({ error: prepRes.error.message }, { status: 403 });
  }
  const prepared = prepRes.data ?? 0;

  // Pull pending rows with student emails (RLS scopes to caller's section).
  const { data: pending, error: pendingErr } = await supabase
    .from("announcement_email_deliveries")
    .select(
      "id, announcement:announcements(title, body), students(profiles(email))"
    )
    .eq("announcement_id", announcementId)
    .eq("status", "pending");
  if (pendingErr) {
    return NextResponse.json({ error: pendingErr.message }, { status: 500 });
  }

  const rows = (pending ?? []) as {
    id: string;
    announcement: { title: string; body: string }[] | { title: string; body: string } | null;
    students: { profiles?: { email?: string }[] | null }[] | { profiles?: { email?: string } | null } | null;
  }[];

  if (!RESEND_API_KEY) {
    return NextResponse.json({
      skipped: true,
      prepared,
      message:
        "Deliveries staged but RESEND_API_KEY is not set — no emails were sent. Add it in Vercel and re-send.",
    });
  }

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const ann = Array.isArray(row.announcement) ? row.announcement[0] : row.announcement;
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const email = Array.isArray(student?.profiles)
      ? student.profiles[0]?.email
      : student?.profiles?.email;
    if (!ann || !email) {
      await supabase.rpc("mark_email_delivery", {
        p_delivery_id: row.id,
        p_status: "failed",
        p_error: "Missing announcement or email",
      });
      failed += 1;
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
          from: EMAIL_FROM,
          to: [email],
          subject: `NUSkor: ${ann.title}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 8px;color:#1a1a1a">${escapeHtml(ann.title)}</h2>
              <p style="color:#555;line-height:1.6;white-space:pre-wrap">${escapeHtml(ann.body)}</p>
              <p style="margin-top:24px;font-size:12px;color:#999">
                <a href="https://nuskor.vercel.app/announcements" style="color:#b8860b">View in NUSkor</a>
              </p>
            </div>
          `,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string };
      if (!res.ok) throw new Error(`Resend ${res.status}: ${json.id ?? "error"}`);
      await supabase.rpc("mark_email_delivery", {
        p_delivery_id: row.id,
        p_status: "sent",
        p_message_id: json.id ?? null,
      });
      sent += 1;
    } catch (e) {
      await supabase.rpc("mark_email_delivery", {
        p_delivery_id: row.id,
        p_status: "failed",
        p_error: e instanceof Error ? e.message : String(e),
      });
      failed += 1;
    }
  }

  return NextResponse.json({ prepared, sent, failed });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}