"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  CalendarClock,
  Users,
  CheckCircle2,
  XCircle,
  CircleDot,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Booking,
  EvaluationPeriod,
  SlotWithBookings,
} from "@/lib/types";
import { cleanName, formatDate, formatSlotRange, one } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useRealtime } from "@/lib/hooks/useRealtime";

interface PeriodWithData extends EvaluationPeriod {
  slots: SlotWithBookings[];
  booking: Booking | null;
}

export default function EvaluationsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PeriodWithData[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;

    const [periodRes, bookingRes] = await Promise.all([
      supabase
        .from("evaluation_periods")
        .select("*, section:course_sections(section_code, course:courses(code, title))")
        .eq("is_closed", false)
        .gte("ends_on", todayIso)
        .order("starts_on", { ascending: true }),
      supabase
        .from("bookings")
        .select("*, evaluation_slots(slot_date, start_time, end_time), evaluated_by, evaluated_by_name")
        .eq("student_id", user.id),
    ]);

    if (periodRes.error || bookingRes.error) return;

    const rawPeriods = periodRes.data as EvaluationPeriod[];
    const bookings = (bookingRes.data ?? []) as Booking[];

    const withSlots = await Promise.all(
      rawPeriods.map(async (p) => {
        const { data } = await supabase.rpc("get_slots_with_counts", {
          p_period_id: p.id,
        });
        return {
          ...p,
          slots: (data ?? []) as SlotWithBookings[],
          booking:
            bookings.find(
              (b) =>
                b.evaluation_period_id === p.id && b.status !== "cancelled"
            ) ?? null,
        };
      })
    );

    setPeriods(withSlots);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Realtime: refetch when bookings or slots change
  useRealtime({
    table: "bookings",
    onChange: load,
    enabled: !!userId,
  });
  useRealtime({
    table: "evaluation_slots",
    onChange: load,
    enabled: !!userId,
  });

  async function bookSlot(periodId: string, slotId: string) {
    setActing(slotId);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("book_evaluation_slot", {
      p_period_id: periodId,
      p_slot_id: slotId,
    });
    setActing(null);

    if (err) return error(err.message);
    success("Slot booked! See you at the evaluation.");
    await load();
  }

  async function cancelBooking() {
    if (!cancelTarget) return;
    setActing("cancel");
    const supabase = createClient();
    const { error: err } = await supabase.rpc("cancel_my_booking", {
      p_booking_id: cancelTarget.id,
    });
    setActing(null);
    setCancelTarget(null);
    if (err) return error(err.message);
    success("Booking cancelled. You can book a new slot.");
    await load();
  }

  if (loading) return <Spinner label="Loading evaluation periods..." />;

  return (
    <div>
      <PageHeader
        title="Evaluation Scheduling"
        subtitle="Pick the slot that works best for you. One booking per evaluation period."
        icon={CalendarDays}
      />

      {periods.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No open evaluation periods"
            description="Nothing is open for booking right now. Check back when your TA opens a new period, or watch the announcements."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {periods.map((period) => (
            <section key={period.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-ink">{period.title}</h2>
                    <Badge tone={period.booking ? "green" : "gold"}>
                      {period.booking ? "Booked" : "Open for booking"}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/55">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-gold-deep" />
                      {formatDate(period.starts_on)} to {formatDate(period.ends_on)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gold-deep" />
                      {(() => {
                        const sec = one(period.section);
                        return sec
                          ? `${sec.course?.code ?? "Course"} → ${sec.section_code}`
                          : "Course";
                      })()}
                    </span>
                  </p>
                </div>
              </div>

              {period.booking && period.booking.evaluation_status === "done" && (() => {
                const completedAt = period.booking!.evaluation_completed_at
                  ? new Date(period.booking!.evaluation_completed_at)
                  : null;
                const evalDate = completedAt ? formatDate(completedAt) : null;
                const evalTime = completedAt
                  ? completedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : null;
                const taName = cleanName(period.booking?.evaluated_by_name) || "—";
                return (
                  <div className="border-b border-green-200 bg-green-50/50 px-5 py-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-green-800">Evaluation Completed</p>
                          <Lock className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <p className="mt-1 text-sm text-ink/60">
                          Thank you for giving your evaluation! Your evaluation has been completed
                          successfully. Please wait for the marks to be finalized.
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-green-200/60 pt-3 sm:grid-cols-3">
                          {evalDate && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                                Evaluation Date
                              </p>
                              <p className="text-xs font-medium text-ink">{evalDate}</p>
                            </div>
                          )}
                          {evalTime && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                                Evaluation Time
                              </p>
                              <p className="text-xs font-medium text-ink">{evalTime}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                              Evaluated By
                            </p>
                            <p className="text-xs font-medium text-ink">{taName}</p>
                          </div>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/40">
                          <Lock className="h-3 w-3" />
                          This evaluation is completed and cannot be changed or booked again.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {period.booking && period.booking.evaluation_status !== "done" && (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-green-50/70 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
                    <div>
                      <p className="font-bold text-ink">Your slot is confirmed</p>
                      <p className="text-sm text-ink/60">
                        {period.booking.evaluation_slots
                          ? `${formatDate(period.booking.evaluation_slots.slot_date)}, ${formatSlotRange(period.booking.evaluation_slots.start_time, period.booking.evaluation_slots.end_time)}`
                          : "Booking confirmed"}
                        {" "}· {period.booking.status}
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          <CircleDot className="h-3.5 w-3.5" />
                          Evaluation Pending
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-ink/45">
                        Want a different time? Pick any free slot below to switch instantly.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCancelTarget(period.booking)}
                    className="btn-outline text-red-600 hover:border-red-300 hover:bg-red-50"
                    disabled={acting === "cancel"}
                  >
                    <XCircle className="h-4 w-4" /> Cancel booking
                  </button>
                </div>
              )}

              {period.booking?.evaluation_status === "done" ? null : (
                period.slots.length === 0 ? (
                <div className="px-5 py-8">
                  <EmptyState
                    title="No slots published yet"
                    description="The TA hasn't added time slots for this period. Check back soon."
                  />
                </div>
              ) : (
                <div className="px-5 py-5">
                  {(() => {
                    const groups: { date: string; slots: typeof period.slots }[] = [];
                    for (const slot of period.slots) {
                      const last = groups[groups.length - 1];
                      if (last && last.date === slot.slot_date) {
                        last.slots.push(slot);
                      } else {
                        groups.push({ date: slot.slot_date, slots: [slot] });
                      }
                    }
                    return groups.map((group, gi) => {
                      const d = new Date(group.date + "T00:00:00");
                      const dayName = d.toLocaleDateString("en-GB", { weekday: "long" });
                      const dateLabel = formatDate(group.date);
                      return (
                        <div key={group.date} className={gi > 0 ? "mt-5 border-t border-black/[0.06] pt-5" : ""}>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink/50">{dayName}</p>
                          <p className="mb-3 text-sm font-semibold text-ink">{dateLabel}</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {group.slots.map((slot) => {
                              const full = slot.booked >= slot.capacity;
                              const mine = period.booking?.slot_id === slot.slot_id;
                              const available = slot.is_open && !full && !mine;
                              return (
                                <div
                                  key={slot.slot_id}
                                  className={
                                    mine
                                      ? "rounded-xl border-2 border-green-500 bg-green-50/50 p-4"
                                      : available
                                        ? "rounded-xl border border-black/[0.08] bg-white p-4 transition-all hover:border-gold hover:shadow-lift"
                                        : "rounded-xl border border-black/[0.05] bg-paper/80 p-4 opacity-70"
                                  }
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                                      <Clock className="h-4 w-4 text-gold-deep" />
                                      {formatSlotRange(slot.start_time, slot.end_time)}
                                    </span>
                                    <Badge
                                      tone={
                                        mine
                                          ? "green"
                                          : !slot.is_open
                                            ? "red"
                                            : full
                                              ? "red"
                                              : "neutral"
                                      }
                                    >
                                      {mine
                                        ? `Yours (${slot.booked}/${slot.capacity})`
                                        : !slot.is_open
                                          ? "Closed"
                                          : full
                                            ? `Full (${slot.booked}/${slot.capacity})`
                                            : `Free · ${slot.booked}/${slot.capacity}`}
                                    </Badge>
                                  </div>
                                  <button
                                    onClick={() => bookSlot(period.id, slot.slot_id)}
                                    disabled={!available || acting === slot.slot_id}
                                    className={
                                      mine
                                        ? "btn-outline mt-3 w-full py-2 text-xs"
                                        : "btn-primary mt-3 w-full py-2 text-xs"
                                    }
                                  >
                                    {acting === slot.slot_id
                                      ? "Booking..."
                                      : mine
                                        ? "Your slot"
                                        : !slot.is_open
                                          ? "Closed"
                                          : full
                                            ? "Slot full"
                                            : period.booking
                                              ? "Switch to this slot"
                                              : "Book this slot"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancelBooking}
        title="Cancel this booking?"
        message="Your slot will be freed up for other students. You can book a new slot afterwards."
        confirmLabel="Cancel booking"
      />
    </div>
  );
}