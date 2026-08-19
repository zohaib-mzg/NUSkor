import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-announcement-emails`;

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

  // Call the Edge Function directly so the real error body is surfaced.
  let res: Response;
  try {
    res = await fetch(FUNCTIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
      },
      body: JSON.stringify({ announcementId }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach the Edge Function: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          `Edge function responded ${res.status}: ${JSON.stringify(data)}. Deploy with: supabase functions deploy send-announcement-emails --no-verify-jwt`,
        prepared,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}