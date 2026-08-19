"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [listRes, countRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
    ]);
    if (!listRes.error) setItems((listRes.data ?? []) as Notification[]);
    if (!countRes.error) setUnread(countRes.count ?? 0);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function openItem(n: Notification) {
    const supabase = createClient();
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    setOpen(false);
    router.push(/mark/i.test(n.title) ? "/marks" : "/announcements");
    load();
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    load();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
        className="relative rounded-lg p-2 text-ink transition-colors hover:bg-black/5"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink/45">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={cn(
                    "block w-full border-b border-black/[0.04] px-4 py-3 text-left transition-colors last:border-0 hover:bg-paper",
                    !n.is_read && "bg-gold/[0.07]"
                  )}
                >
                  <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Megaphone className="h-3 w-3 text-gold-deep" />
                    {n.title}
                    {!n.is_read && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink/55">{n.message}</p>
                  <p className="mt-1 text-[10px] text-ink/35">
                    {formatDate(n.created_at, true)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}