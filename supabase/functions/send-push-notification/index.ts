// Web Push delivery for NUSkor.
//
// Flow (see schema.sql RPCs):
//   1. Frontend calls create_notifications(type, id) -> creates in-app
//      rows and returns { recipients, payload }.
//   2. If recipients exist, the frontend invokes THIS function with the
//      user's access token (verify_jwt on), body { type, relatedId }.
//   3. We re-validate the caller + re-derive recipients server-side via
//      get_push_recipients() (never trusts the client).
//   4. We read each recipient's device subscriptions (service role),
//      respect per-category settings, and send a Web Push message.
//   5. Dead subscriptions (410 gone / 404 not found) are deleted.
//
// Secrets (Supabase): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT, SUPABASE_SERVICE_ROLE_KEY (auto).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@nuskor.app";

webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Authenticate the caller (verify_jwt is on, so req has a valid token).
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let type: string;
  let relatedId: string;
  let isTest = false;
  try {
    const body = await req.json();
    isTest = body.test === true;
    type = String(body.type ?? "");
    relatedId = String(body.relatedId ?? "");
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  // Self-test path: deliver a fixed message to the CALLING user's own
  // devices only. No RPC validation needed (JWT already proven above).
  if (isTest) {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: mySubs, error: myErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user.id);
    if (myErr) return json({ error: myErr.message }, 500);
    let sent = 0;
    for (const sub of mySubs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Test notification",
            body: "This is a test push from NUSkor. Notifications are working.",
            data: { url: "/settings" },
          }),
        );
        sent += 1;
      } catch {
        // ignore individual device failures in the self-test
      }
    }
    return json({ sent, recipients: mySubs?.length ?? 0 });
  }

  if (!type || !relatedId) {
    return json({ error: "type and relatedId are required" }, 400);
  }

  // Server-side re-validation + recipient derivation. Any error here
  // (unknown type, not the TA/admin, not released yet) propagates as
  // an exception and we return 403/400.
  let target: {
    recipients: string[];
    payload: { title: string; message: string; url: string } | null;
  };
  try {
    const { data, error } = await supabase.rpc("get_push_recipients", {
      p_type: type,
      p_related_id: relatedId,
    });
    if (error) throw new Error(error.message);
    target = data as typeof target;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to resolve recipients";
    return json({ error: msg }, 403);
  }

  if (!target || !target.payload || target.recipients.length === 0) {
    return json({ sent: 0, removed: 0, skipped: 0, recipients: 0 });
  }

  // Service-role client for reading recipients' subscriptions + settings.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const category = {
    announcement: "announcements",
    marks_released: "marks_released",
    evaluation_created: "evaluation_updates",
  }[type];

  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  if (subsError) return json({ error: subsError.message }, 500);

  if (!subs || subs.length === 0) {
    return json({ sent: 0, removed: 0, skipped: 0, recipients: target.recipients.length });
  }

  // Per-user category settings (users without a row default to enabled).
  const { data: settings } = await admin
    .from("user_notification_settings")
    .select("user_id, announcements, marks_released, evaluation_updates");
  const settingMap = new Map<
    string,
    { announcements: boolean; marks_released: boolean; evaluation_updates: boolean }
  >();
  for (const s of settings ?? []) settingMap.set(s.user_id, s);

  const recipientSet = new Set(target.recipients);
  const payload = JSON.stringify({
    title: target.payload.title,
    body: target.payload.message,
    data: { url: target.payload.url },
  });

  let sent = 0;
  let removed = 0;
  let skipped = 0;

  for (const sub of subs) {
    if (!recipientSet.has(sub.user_id)) continue;
    const prefs = settingMap.get(sub.user_id);
    if (category && prefs && prefs[category as keyof typeof prefs] === false) {
      skipped += 1;
      continue;
    }
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent += 1;
    } catch (err) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
        removed += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return json({ sent, removed, skipped, recipients: target.recipients.length });
});