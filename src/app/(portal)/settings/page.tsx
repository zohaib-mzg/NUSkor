"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  deletePushSubscription,
  getNotificationSettings,
  getPushSubscription,
  isPushSupported,
  listDeviceSubscriptions,
  savePushSubscription,
  setNotificationSettings,
  subscribeToPush,
} from "@/lib/push";
import type { NotificationSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";

export default function SettingsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supported] = useState<boolean>(() => isPushSupported());
  const [enabled, setEnabled] = useState(false);
  const [devices, setDevices] = useState<{ id: string; endpoint: string; created_at: string }[]>([]);
  const [prefs, setPrefs] = useState<NotificationSettings | null>(null);

  const load = useCallback(async () => {
    const sub = await getPushSubscription();
    const [dev, settings] = await Promise.all([
      listDeviceSubscriptions(),
      getNotificationSettings(),
    ]);
    setEnabled(!!sub && dev.length > 0);
    setDevices(dev);
    setPrefs(settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function enable() {
    setBusy(true);
    try {
      if (Notification.permission === "denied") {
        error("Notifications are blocked in your browser. Allow them for this site in your browser settings, then retry.");
        return;
      }
      const sub = await subscribeToPush();
      if (!sub) {
        error("Could not subscribe to push notifications. Make sure the browser permission is granted.");
        return;
      }
      const saved = await savePushSubscription(sub);
      if (!saved) {
        error("Could not save this device. Try again.");
        return;
      }
      success("Browser notifications enabled for this device.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await getPushSubscription();
      await sub?.unsubscribe();
      for (const d of devices) {
        await deletePushSubscription(d.endpoint);
      }
      success("Browser notifications disabled on all devices.");
      setEnabled(false);
      setDevices([]);
    } finally {
      setBusy(false);
    }
  }

  async function togglePref(key: "announcements" | "marks_released" | "evaluation_updates") {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const ok = await setNotificationSettings({ [key]: next[key] });
    if (!ok) {
      setPrefs(prefs);
      error("Could not save your preferences.");
    }
  }

  if (loading) return <Spinner label="Loading settings..." />;

  const prefRows: { key: "announcements" | "marks_released" | "evaluation_updates"; label: string; hint: string }[] = [
    { key: "announcements", label: "Announcements", hint: "New announcements from your TA and admins." },
    { key: "marks_released", label: "Marks released", hint: "When marks for an assessment are released to you." },
    { key: "evaluation_updates", label: "Evaluation updates", hint: "New evaluation periods and booking reminders." },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your browser notifications. In-app notifications always appear in the bell."
        icon={Bell}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Browser notifications */}
        <section className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink">Browser notifications</h2>
              <p className="mt-1 text-sm text-ink/55">
                {enabled
                  ? "Push is on for this account. You will receive a system notification on every enrolled device."
                  : "Turn on push to get notifications even when NUSkor is not open."}
              </p>
            </div>
            {supported ? (
              enabled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  <Bell className="h-3.5 w-3.5" /> On
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-ink/60">
                  <BellOff className="h-3.5 w-3.5" /> Off
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-ink/60">
                Unsupported
              </span>
            )}
          </div>

          {!supported && (
            <p className="mt-4 rounded-xl border border-black/[0.07] bg-paper p-4 text-sm text-ink/55">
              Your browser does not support Web Push. You can still use NUSkor, but
              notifications will only appear inside the app.
            </p>
          )}

          {supported && (
            <div className="mt-5">
              {enabled ? (
                <button onClick={disable} disabled={busy} className="btn-outline w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                  Disable browser notifications
                </button>
              ) : (
                <button onClick={enable} disabled={busy} className="btn-primary w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  Enable browser notifications
                </button>
              )}
            </div>
          )}
        </section>

        {/* Categories */}
        <section className="card p-6">
          <h2 className="font-bold text-ink">Notification categories</h2>
          <p className="mt-1 text-sm text-ink/55">
            Choose which categories push to your devices. Disabling a category only stops
            push; you still see it inside NUSkor.
          </p>
          <div className="mt-4 space-y-3">
            {prefRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-black/[0.07] bg-paper px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{row.label}</p>
                  <p className="text-xs text-ink/50">{row.hint}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={prefs?.[row.key] ?? true}
                  onClick={() => togglePref(row.key)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    (prefs?.[row.key] ?? true) ? "bg-gold-deep" : "bg-ink/20"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      (prefs?.[row.key] ?? true) ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}