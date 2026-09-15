"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions {
  /** Supabase table name */
  table: string;
  /** Postgres change events to listen for (default: ["*"]) */
  events?: PostgresEvent[];
  /** Optional Postgres filter string, e.g. "student_id=eq.123" */
  filter?: string;
  /** Called when a matching change occurs. Typically used to refetch data. */
  onChange?: () => void;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime postgres_changes on a single table.
 *
 * When a matching row changes, calls `onChange`. RLS is enforced server-side —
 * the client only receives events for rows the authenticated user can read.
 *
 * Usage:
 *   useRealtime({
 *     table: "bookings",
 *     events: ["INSERT", "UPDATE", "DELETE"],
 *     filter: `student_id=eq.${userId}`,
 *     onChange: () => load(),
 *   });
 */
export function useRealtime({
  table,
  events = ["*"],
  filter,
  onChange,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !onChange) return;

    const supabase = createClient();
    const channel = supabase.channel(`realtime:${table}`);

    for (const event of events) {
      channel.on(
        "postgres_changes" as never,
        {
          event,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        } as never,
        () => {
          onChangeRef.current?.();
        }
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled]);
}
