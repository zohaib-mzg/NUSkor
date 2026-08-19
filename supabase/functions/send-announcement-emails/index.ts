import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { Resend } from "npm:resend@4.1.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailHtml(opts: {
  studentName: string;
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  title: string;
  body: string;
  isMarks: boolean;
  baseUrl: string;
}) {
  const sectionLine = opts.sectionCode
    ? `<p style="margin:0;color:#555;line-height:1.7">Course: <b>${escapeHtml(opts.courseCode)}</b></p>
       <p style="margin:0;color:#555;line-height:1.7">Subject: ${escapeHtml(opts.courseTitle)}</p>
       <p style="margin:0;color:#555;line-height:1.7">Section: ${escapeHtml(opts.sectionCode)}</p>`
    : `<p style="margin:0;color:#555;line-height:1.7">Course: <b>${escapeHtml(opts.courseCode)}</b></p>`;

  const buttonHref = opts.isMarks ? `${opts.baseUrl}/marks` : `${opts.baseUrl}/announcements`;
  const buttonLabel = opts.isMarks ? "View Your Marks" : "View Announcement";
  const intro = opts.isMarks
    ? `Your TA has uploaded the <b>${escapeHtml(opts.title)}</b> marks for:`
    : `Your TA has posted a new announcement for:`;

  return `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
  <h1 style="font-size:22px;font-weight:800;color:#1a1a1a;margin:0 0 4px">NUSkor</h1>
  <h2 style="font-size:16px;font-weight:700;color:#b8860b;margin:0 0 20px">${escapeHtml(opts.title)}</h2>

  <p style="color:#1a1a1a;line-height:1.7">Hi ${escapeHtml(opts.studentName)},</p>

  <p style="color:#1a1a1a;line-height:1.7">${intro}</p>
  <div style="background:#faf7ef;border-radius:10px;padding:16px 18px;margin:12px 0">
    ${sectionLine}
  </div>

  <p style="color:#555;line-height:1.7">${escapeHtml(opts.body)}</p>

  <p style="color:#555;line-height:1.7">You can now log in to NUSkor to view the full details.</p>

  <p style="margin:28px 0">
    <a href="${buttonHref}"
       style="display:inline-block;background:#b8860b;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:8px">
      ${buttonLabel}
    </a>
  </p>

  <p style="color:#999;font-size:12px;margin-top:32px">NUSkor<br/>TA Evaluation & Marks Portal</p>
</div>
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "NUSkor Announcements <onboarding@resend.dev>";
  const baseUrl = Deno.env.get("APP_URL") ?? "https://nuskor.vercel.app";

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Supabase env not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let announcementId: string;
  try {
    const body = await req.json();
    announcementId = String(body.announcementId ?? "");
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!announcementId) {
    return json({ error: "Missing announcementId" }, 400);
  }

  const { data: ann, error: annErr } = await supabase
    .from("announcements")
    .select("id, title, body, section:course_sections(section_code, course:courses(code, title))")
    .eq("id", announcementId)
    .single();
  if (annErr || !ann) {
    return json({ error: "Announcement not found" }, 404);
  }

  const section = Array.isArray(ann.section) ? ann.section[0] : ann.section;
  const course = Array.isArray(section?.course) ? section.course[0] : section?.course;
  const courseCode = course?.code ?? "";
  const courseTitle = course?.title ?? "";
  const sectionCode = section?.section_code ?? "";
  const isMarks = /mark/i.test(ann.title ?? "");

  const { data: pending, error: pendErr } = await supabase
    .from("announcement_email_deliveries")
    .select("id, student:students(profiles(full_name, email))")
    .eq("announcement_id", announcementId)
    .eq("status", "pending");
  if (pendErr) {
    return json({ error: pendErr.message }, 500);
  }

  if (!apiKey) {
    return json({
      skipped: true,
      prepared: pending?.length ?? 0,
      message:
        "Deliveries staged but RESEND_API_KEY is not set on the Supabase project. Set it with: supabase secrets set RESEND_API_KEY=re_...",
    });
  }

  const resend = new Resend(apiKey);
  const subject = isMarks
    ? `NUSkor | ${ann.title}`
    : `NUSkor | New Announcement for ${courseCode}${sectionCode ? ` Section ${sectionCode}` : ""}`;

  let sent = 0;
  let failed = 0;

  for (const row of pending ?? []) {
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    const profile = Array.isArray(student?.profiles) ? student.profiles[0] : student?.profiles;
    const email = profile?.email;
    const name = profile?.full_name ?? email?.split("@")[0] ?? "Student";

    if (!email) {
      await supabase
        .from("announcement_email_deliveries")
        .update({ status: "failed", error_message: "Missing student email" })
        .eq("id", row.id);
      failed += 1;
      continue;
    }

    try {
      const { error: sendErr } = await resend.emails.send({
        from,
        to: [email],
        subject,
        html: emailHtml({
          studentName: name,
          courseCode,
          courseTitle,
          sectionCode,
          title: ann.title,
          body: ann.body,
          isMarks,
          baseUrl,
        }),
      });
      if (sendErr) throw sendErr;
      await supabase
        .from("announcement_email_deliveries")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("announcement_email_deliveries")
        .update({ status: "failed", error_message: msg.slice(0, 500) })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return json({ prepared: pending?.length ?? 0, sent, failed });
});