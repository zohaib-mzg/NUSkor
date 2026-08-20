import { createClient } from "@/lib/supabase/client";
import type { NotificationSettings, NotifyResult } from "@/lib/types";

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await registerServiceWorker();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const publicKey = getVapidPublicKey();
  if (!publicKey) return null;
  const reg = await registerServiceWorker();
  if (!reg) return null;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  return sub;
}

export async function savePushSubscription(sub: PushSubscription): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
      },
      { onConflict: "endpoint" },
    );
  return !error;
}

export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return !error;
}

export async function listDeviceSubscriptions(): Promise<{ id: string; endpoint: string; created_at: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, created_at");
  return (data ?? []) as { id: string; endpoint: string; created_at: string }[];
}

export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const supabase = createClient();
  const { data } = await supabase.from("user_notification_settings").select("*").maybeSingle();
  return (data as NotificationSettings | null) ?? null;
}

export async function setNotificationSettings(patch: {
  announcements?: boolean;
  marks_released?: boolean;
  evaluation_updates?: boolean;
}): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("user_notification_settings").upsert(patch);
  return !error;
}

/**
 * Creates in-app notifications server-side and, when there are
 * recipients, hands off to the send-push-notification Edge Function
 * (which re-validates the caller and sends the actual Web Push).
 */
export async function notifyAll(type: string, relatedId: string): Promise<NotifyResult | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_notifications", {
    p_type: type,
    p_related_id: relatedId,
  });
  if (error) throw new Error(error.message);
  const result = data as NotifyResult;
  if (result && result.recipients.length > 0) {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: { type, relatedId },
      });
    } catch {
      // push failures never break the in-app notification flow
    }
  }
  return result;
}