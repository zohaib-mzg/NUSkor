"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  CalendarClock,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Booking,
  EvaluationPeriod,
  SlotWithBookings,
} from "@/lib/types";
import { formatDate, one } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface PeriodWithData extends EvaluationPeriod {
  slots: SlotWithBookings[];
  booking: Booking | null;
}

export default function EvaluationsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PeriodWithData[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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
        .select("*, evaluation_slots(slot_date, start_time, end_time)")
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
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

              {period.booking && (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-green-50/70 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
                    <div>
                      <p className="font-bold text-ink">Your slot is confirmed</p>
                      <p className="text-sm text-ink/60">
                        {period.booking.evaluation_slots
                          ? `${formatDate(period.booking.evaluation_slots.slot_date)}, ${period.booking.evaluation_slots.start_time}–${period.booking.evaluation_slots.end_time}`
                          : "Booking confirmed"}
                        {" "}· {period.booking.status}
                      </p>
                      <p className="text-xs text-ink/45">
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

              {period.slots.length === 0 ? (
                <div className="px-5 py-8">
                  <EmptyState
                    title="No slots published yet"
                    description="The TA hasn't added time slots for this period. Check back soon."
                  />
                </div>
              ) : (
                <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
                  {period.slots.map((slot) => {
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
                            {slot.start_time}–{slot.end_time}
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
                        <p className="mt-2 text-sm text-ink/60">
                          {formatDate(slot.slot_date)}
                        </p>
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
              )}
            </section>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-ink/45">
        <Badge tone="gold">Important</Badge>
        Slot capacity and the one-booking-per-period rule are enforced in the
        database. Even direct API calls can&apos;t book twice.
      </div>

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