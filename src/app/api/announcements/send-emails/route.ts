import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

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

  // Stage delivery rows (validates the caller is the section's TA/admin).
  const prepRes = await supabase.rpc("prepare_email_deliveries", {
    p_announcement_id: announcementId,
  });
  if (prepRes.error) {
    return NextResponse.json({ error: prepRes.error.message }, { status: 403 });
  }
  const prepared = prepRes.data ?? 0;

  // Send via the Supabase Edge Function (Resend key lives in Supabase secrets).
  const { data, error: invokeErr } = await supabase.functions.invoke(
    "send-announcement-emails",
    { body: { announcementId } }
  );
  if (invokeErr) {
    return NextResponse.json(
      {
        error:
          `Edge function failed: ${invokeErr.message}. Deploy it with: supabase functions deploy send-announcement-emails --no-verify-jwt`,
        prepared,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? {});
}