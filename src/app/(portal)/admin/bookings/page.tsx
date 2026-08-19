"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Search, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

export default function BookingsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("bookings")
      .select(
        "*, evaluation_slots(slot_date, slot_time), evaluation_periods(title, course:courses(code)), students(profiles(full_name, email))"
      )
      .order("created_at", { ascending: false });
    if (err) {
      setLoading(false);
      return error(err.message);
    }
    setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = bookings.filter((b) => {
    const q = query.toLowerCase();
    return (
      (b.students?.[0]?.profiles?.[0]?.email ?? "").toLowerCase().includes(q) ||
      (b.students?.[0]?.profiles?.[0]?.full_name ?? "").toLowerCase().includes(q) ||
      (b.evaluation_periods?.title ?? "").toLowerCase().includes(q) ||
      (b.evaluation_periods?.course?.code ?? "").toLowerCase().includes(q)
    );
  });

  async function setStatus(b: Booking, status: "confirmed" | "cancelled") {
    setActing(b.id);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", b.id);
    setActing(null);
    if (err) return error(err.message);
    success(status === "confirmed" ? "Booking confirmed." : "Booking cancelled.");
    load();
  }

  if (loading) return <Spinner label="Loading bookings..." />;

  const statusTone = (s: string) =>
    s === "confirmed" ? "green" : s === "pending" ? "gold" : "red";

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Every student evaluation booking, across all periods."
        icon={CalendarDays}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input
              className="input pl-9 sm:w-72"
              placeholder="Search student or period..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      />

      {bookings.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No bookings yet"
            description="Students' bookings will appear here as soon as they book a slot."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-paper">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Evaluation</th>
                  <th className="th">Slot</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="bg-white">
                    <td className="td">
                      <p className="font-semibold text-ink">
                        {b.students?.[0]?.profiles?.[0]?.full_name ?? "Student"}
                      </p>
                      <p className="text-xs text-ink/50">{b.students?.[0]?.profiles?.[0]?.email}</p>
                    </td>
                    <td className="td">
                      <p className="font-semibold text-ink">
                        {b.evaluation_periods?.title ?? "N/A"}
                      </p>
                      <p className="text-xs text-ink/50">
                        {b.evaluation_periods?.course?.code ?? ""}
                      </p>
                    </td>
                    <td className="td text-ink/70">
                      {b.evaluation_slots
                        ? `${formatDate(b.evaluation_slots.slot_date)}, ${formatTime(b.evaluation_slots.slot_time)}`
                        : "N/A"}
                    </td>
                    <td className="td">
                      <Badge tone={(statusTone(b.status) as "green" | "gold" | "red")}>{b.status}</Badge>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        {b.status !== "confirmed" && (
                          <button
                            className="btn-outline px-3 py-1.5 text-xs text-green-700 hover:border-green-300 hover:bg-green-50"
                            onClick={() => setStatus(b, "confirmed")}
                            disabled={acting === b.id}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </button>
                        )}
                        {b.status !== "cancelled" && (
                          <button
                            className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                            onClick={() => setStatus(b, "cancelled")}
                            disabled={acting === b.id}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="td text-center text-ink/40">
                      No bookings match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}