"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Plus,
  Clock,
  Power,
  Trash2,
  Wand2,
  MoreVertical,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  ChevronUp,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyAll } from "@/lib/push";
import type {
  Booking,
  CourseSection,
  EvaluationPeriod,
  SlotWithBookings,
} from "@/lib/types";
import {
  cleanName,
  formatDate,
  formatSlotRange,
  formatCompactPeriodDate,
  one,
  regNoDisplay,
} from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useRealtime } from "@/lib/hooks/useRealtime";

interface PeriodAdmin extends EvaluationPeriod {
  slots: SlotWithBookings[];
  completedCount: number;
}

export default function TaEvaluationPeriodsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [periods, setPeriods] = useState<PeriodAdmin[]>([]);
  const [modal, setModal] = useState(false);
  const [slotFor, setSlotFor] = useState<PeriodAdmin | null>(null);
  const [genFor, setGenFor] = useState<PeriodAdmin | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [toClose, setToClose] = useState<PeriodAdmin | null>(null);
  const [toReopen, setToReopen] = useState<PeriodAdmin | null>(null);
  const [toDeleteAllSlots, setToDeleteAllSlots] = useState<PeriodAdmin | null>(null);
  const [toDeletePeriod, setToDeletePeriod] = useState<PeriodAdmin | null>(null);
  const [toDeleteSlot, setToDeleteSlot] = useState<{
    period: PeriodAdmin;
    slotId: string;
  } | null>(null);
  const [markingEval, setMarkingEval] = useState<string | null>(null);

  // Expandable bookings state
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [slotBookings, setSlotBookings] = useState<Booking[]>([]);
  const [slotBookingsLoading, setSlotBookingsLoading] = useState(false);

  // ⋮ menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: stRes } = await supabase
      .from("section_tas")
      .select("section_id, section:course_sections(*, course:courses(code, title))");
    const rows = (stRes ?? []) as {
      section_id: string;
      section: (CourseSection & { course?: { code: string; title: string }[] | null })[];
    }[];
    const secs = rows
      .map((r) => one(r.section))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => s as CourseSection);
    setSections(secs);

    const ids = secs.map((s) => s.id);
    let raw: EvaluationPeriod[] = [];
    if (ids.length > 0) {
      const pRes = await supabase
        .from("evaluation_periods")
        .select("*, section:course_sections(section_code, course:courses(code, title))")
        .in("section_id", ids)
        .order("starts_on", { ascending: false });
      raw = (pRes.data ?? []) as EvaluationPeriod[];
    }
    const withSlots = await Promise.all(
      raw.map(async (p) => {
        const { data } = await supabase.rpc("get_slots_with_counts", {
          p_period_id: p.id,
        });
        return { ...p, slots: (data ?? []) as SlotWithBookings[] };
      })
    );

    // Fetch completed evaluation counts per period
    const periodIds = withSlots.map((p) => p.id);
    const completedMap = new Map<string, number>();
    if (periodIds.length > 0) {
      const { data: completedRows } = await supabase
        .from("bookings")
        .select("evaluation_period_id")
        .in("evaluation_period_id", periodIds)
        .eq("status", "confirmed")
        .eq("evaluation_status", "done");
      for (const row of completedRows ?? []) {
        const r = row as { evaluation_period_id: string };
        completedMap.set(r.evaluation_period_id, (completedMap.get(r.evaluation_period_id) ?? 0) + 1);
      }
    }

    const withCompleted = withSlots.map((p) => ({
      ...p,
      completedCount: completedMap.get(p.id) ?? 0,
    }));
    setPeriods(withCompleted);
    setLoading(false);
  }, []);

  // Refresh only completed counts (lightweight, no full reload)
  const refreshCompletedCounts = useCallback(async () => {
    const supabase = createClient();
    setPeriods((prev) => {
      if (prev.length === 0) return prev;
      const periodIds = prev.map((p) => p.id);
      supabase
        .from("bookings")
        .select("evaluation_period_id")
        .in("evaluation_period_id", periodIds)
        .eq("status", "confirmed")
        .eq("evaluation_status", "done")
        .then(({ data }) => {
          const completedMap = new Map<string, number>();
          for (const row of data ?? []) {
            const r = row as { evaluation_period_id: string };
            completedMap.set(r.evaluation_period_id, (completedMap.get(r.evaluation_period_id) ?? 0) + 1);
          }
          setPeriods((curr) =>
            curr.map((p) => ({
              ...p,
              completedCount: completedMap.get(p.id) ?? 0,
            }))
          );
        });
      return prev;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch when bookings change (updates remaining counts)
  useRealtime({
    table: "bookings",
    onChange: load,
  });

  async function toggleBookings(period: PeriodAdmin, slot: SlotWithBookings) {
    const key = slot.slot_id;
    if (expandedSlot === key) {
      setExpandedSlot(null);
      setSlotBookings([]);
      return;
    }
    setExpandedSlot(key);
    setSlotBookingsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, evaluation_slots(slot_date, start_time, end_time), students(registration_no, profiles(full_name, email))"
      )
      .eq("evaluation_period_id", period.id)
      .eq("slot_id", slot.slot_id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });
    setSlotBookings((data ?? []) as Booking[]);
    setSlotBookingsLoading(false);
  }

  async function markDone(bookingId: string) {
    setMarkingEval(bookingId);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("mark_evaluation_done", {
      p_booking_id: bookingId,
    });
    setMarkingEval(null);
    if (err) return error(err.message);
    success("Evaluation marked as done.");
    // Notify the student
    try {
      await notifyAll("evaluation_completed", bookingId);
    } catch (pushErr) {
      console.error("evaluation completed notification failed", pushErr);
    }
    // Refresh remaining counts
    refreshCompletedCounts();
    // Refresh expanded bookings
    if (expandedSlot) {
      const supabase = createClient();
      const period = periods.find((p) =>
        p.slots.some((s) => s.slot_id === expandedSlot)
      );
      if (period) {
        const { data } = await supabase
          .from("bookings")
          .select(
            "*, evaluation_slots(slot_date, start_time, end_time), students(registration_no, profiles(full_name, email))"
          )
          .eq("evaluation_period_id", period.id)
          .eq("slot_id", expandedSlot)
          .eq("status", "confirmed");
        setSlotBookings((data ?? []) as Booking[]);
      }
    }
  }

  async function unmarkDone(bookingId: string) {
    setMarkingEval(bookingId);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("unmark_evaluation_done", {
      p_booking_id: bookingId,
    });
    setMarkingEval(null);
    if (err) return error(err.message);
    success("Evaluation unmarked.");
    // Refresh remaining counts
    refreshCompletedCounts();
    // Refresh expanded bookings
    if (expandedSlot) {
      const supabase = createClient();
      const period = periods.find((p) =>
        p.slots.some((s) => s.slot_id === expandedSlot)
      );
      if (period) {
        const { data } = await supabase
          .from("bookings")
          .select(
            "*, evaluation_slots(slot_date, start_time, end_time), students(registration_no, profiles(full_name, email))"
          )
          .eq("evaluation_period_id", period.id)
          .eq("slot_id", expandedSlot)
          .eq("status", "confirmed");
        setSlotBookings((data ?? []) as Booking[]);
      }
    }
  }

  async function toggleSlot(slot: SlotWithBookings) {
    setMenuOpen(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("evaluation_slots")
      .update({ is_open: !slot.is_open })
      .eq("id", slot.slot_id);
    if (err) return error(err.message);
    success(slot.is_open ? "Slot closed." : "Slot opened.");
    load();
  }

  async function createPeriod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements as unknown as {
      section_id: HTMLSelectElement;
      title: HTMLInputElement;
      starts_on: HTMLInputElement;
      ends_on: HTMLInputElement;
    };
    const payload = {
      section_id: el.section_id.value,
      title: el.title.value.trim(),
      starts_on: el.starts_on.value,
      ends_on: el.ends_on.value,
    };
    if (!payload.section_id || !payload.title || !payload.starts_on || !payload.ends_on) return;
    if (payload.ends_on < payload.starts_on) {
      return error("End date must be on or after the start date.");
    }
    const supabase = createClient();
    const { data, error: err } = await supabase.from("evaluation_periods").insert(payload).select("id").single();
    if (err) return error(err.message);
    success("Evaluation period created.");
    setModal(false);
    load();
    try {
      await notifyAll("evaluation_created", data.id);
    } catch (err) {
      console.error("evaluation notification failed", err);
    }
  }

  async function addSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slotFor) return;
    const el = e.currentTarget.elements as unknown as {
      slot_date: HTMLInputElement;
      start_time: HTMLInputElement;
      end_time: HTMLInputElement;
      capacity: HTMLInputElement;
    };
    const capacity = Number(el.capacity.value || 1);
    const supabase = createClient();
    const { error: err } = await supabase.from("evaluation_slots").insert({
      evaluation_period_id: slotFor.id,
      slot_date: el.slot_date.value,
      start_time: el.start_time.value,
      end_time: el.end_time.value,
      capacity,
    });
    if (err) return error(err.message);
    success("Slot added.");
    setSlotFor(null);
    load();
  }

  async function generateSlots(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!genFor) return;
    const el = e.currentTarget.elements as unknown as {
      from_date: HTMLInputElement;
      to_date: HTMLInputElement;
      weekdays: NodeListOf<HTMLInputElement>;
      start_time: HTMLInputElement;
      end_time: HTMLInputElement;
      duration: HTMLInputElement;
      capacity: HTMLInputElement;
    };
    const from = el.from_date.value;
    const to = el.to_date.value;
    if (!from || !to || to < from) return error("Check the date range.");

    const weekdays = Array.from(el.weekdays)
      .filter((cb) => cb.checked)
      .map((cb) => Number(cb.value));
    if (weekdays.length === 0) return error("Pick at least one weekday.");

    const dates: string[] = [];
    const cur = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    const isoDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    while (cur <= end) {
      if (weekdays.includes(cur.getDay())) {
        dates.push(isoDate(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }

    setGenBusy(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.rpc("generate_slots", {
      p_period_id: genFor.id,
      p_dates: dates,
      p_start_time: el.start_time.value,
      p_end_time: el.end_time.value,
      p_duration_minutes: Number(el.duration.value || 30),
      p_capacity: Number(el.capacity.value || 1),
    });
    setGenBusy(false);
    if (err) return error(err.message);
    success(`Generated ${dates.length} potential slots (${data ?? 0} rows). Duplicates were skipped.`);
    setGenFor(null);
    load();
  }

  async function closePeriod() {
    if (!toClose) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("evaluation_periods")
      .update({ is_closed: true })
      .eq("id", toClose.id);
    if (err) return error(err.message);
    success(`"${toClose.title}" closed for bookings.`);
    setToClose(null);
    load();
  }

  async function reopenPeriod() {
    if (!toReopen) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("evaluation_periods")
      .update({ is_closed: false })
      .eq("id", toReopen.id);
    if (err) return error(err.message);
    success(`"${toReopen.title}" reopened for bookings.`);
    setToReopen(null);
    load();
  }

  async function deleteAllSlots() {
    if (!toDeleteAllSlots) return;
    const supabase = createClient();
    const { error: err, count } = await supabase
      .from("evaluation_slots")
      .delete({ count: "exact" })
      .eq("evaluation_period_id", toDeleteAllSlots.id);
    if (err) return error(err.message);
    success(`Deleted ${count ?? 0} slot${(count ?? 0) === 1 ? "" : "s"} (and any bookings on them).`);
    setToDeleteAllSlots(null);
    load();
  }

  async function deletePeriod() {
    if (!toDeletePeriod) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("evaluation_periods")
      .delete()
      .eq("id", toDeletePeriod.id);
    if (err) return error(err.message);
    success(`"${toDeletePeriod.title}" deleted.`);
    setToDeletePeriod(null);
    load();
  }

  async function deleteSlot() {
    if (!toDeleteSlot) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("evaluation_slots")
      .delete()
      .eq("id", toDeleteSlot.slotId);
    if (err) return error(err.message);
    success("Slot deleted. Bookings on it were removed.");
    setToDeleteSlot(null);
    load();
  }

  if (loading) return <Spinner label="Loading evaluation periods..." />;

  return (
    <div>
      <PageHeader
        title="Evaluation Periods"
        subtitle="Manage evaluation periods, slots and student evaluations"
        icon={CalendarClock}
        actions={
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus className="h-4 w-4" /> New period
          </button>
        }
      />

      {periods.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No evaluation periods"
            description="Create one to get started, then add time slots for students to book."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {periods.map((period) => {
            const totalBooked = period.slots.reduce((s, sl) => s + sl.booked, 0);
            const remaining = totalBooked - period.completedCount;
            const sec = one(period.section);
            const groups: { date: string; slots: SlotWithBookings[] }[] = [];
            for (const slot of period.slots) {
              const last = groups[groups.length - 1];
              if (last && last.date === slot.slot_date) {
                last.slots.push(slot);
              } else {
                groups.push({ date: slot.slot_date, slots: [slot] });
              }
            }

            return (
              <section
                key={period.id}
                className={`card overflow-hidden ${period.is_closed ? "opacity-75" : ""}`}
              >
                {/* Period Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-ink">{period.title}</h2>
                        <Badge tone={period.is_closed ? "neutral" : "gold"}>
                          {period.is_closed ? "Closed" : "Open"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-ink/50">
                        {sec ? `${sec.course?.code} · ${sec.section_code}` : "Section"}{" "}
                        · {formatCompactPeriodDate(period.starts_on, period.ends_on)}{" "}
                        · {period.slots.length} slots · {totalBooked} bookings
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gold-deep">
                        Remaining Evaluations: {remaining}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!period.is_closed && (
                      <button
                        className="btn-primary px-3 py-1.5 text-xs"
                        onClick={() => setSlotFor(period)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add slot
                      </button>
                    )}
                    {!period.is_closed && (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs"
                        onClick={() => setGenFor(period)}
                      >
                        <Wand2 className="h-3.5 w-3.5" /> Auto-generate
                      </button>
                    )}
                    {period.slots.length > 0 && (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                        onClick={() => setToDeleteAllSlots(period)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete all
                      </button>
                    )}
                    {period.is_closed ? (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs"
                        onClick={() => setToReopen(period)}
                      >
                        <Power className="h-3.5 w-3.5" /> Reopen
                      </button>
                    ) : (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                        onClick={() => setToClose(period)}
                      >
                        <Power className="h-3.5 w-3.5" /> Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Slots */}
                {period.slots.length === 0 ? (
                  <div className="px-5 py-8">
                    <EmptyState
                      title="No slots yet"
                      description="Add time slots so students can book."
                    />
                  </div>
                ) : (
                  <div className="px-5 py-5">
                    {groups.map((group, gi) => {
                      const d = new Date(group.date + "T00:00:00");
                      const dayName = d.toLocaleDateString("en-GB", { weekday: "long" });
                      const dateLabel = formatDate(group.date);
                      return (
                        <div key={group.date} className={gi > 0 ? "mt-5 border-t border-black/[0.06] pt-5" : ""}>
                          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink/40">{dayName}</p>
                          <p className="mb-3 text-sm font-semibold text-ink">{dateLabel}</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {group.slots.map((slot) => {
                              const full = slot.booked >= slot.capacity;
                              const closed = !slot.is_open;
                              const expanded = expandedSlot === slot.slot_id;
                              return (
                                <div key={slot.slot_id} className="flex flex-col">
                                  {/* Slot Card */}
                                  <div
                                    className={`relative rounded-xl border p-4 transition-all ${
                                      closed
                                        ? "border-black/[0.06] bg-paper/60 opacity-70"
                                        : full
                                          ? "border-gold/40 bg-white shadow-card"
                                          : "border-gold/30 bg-white shadow-card hover:shadow-lift"
                                    }`}
                                  >
                                    {/* Time + Menu */}
                                    <div className="mb-3 flex items-center justify-between">
                                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                                        <Clock className="h-3.5 w-3.5 text-gold-deep" />
                                        {formatSlotRange(slot.start_time, slot.end_time)}
                                      </span>
                                      <div className="relative" ref={menuOpen === slot.slot_id ? menuRef : undefined}>
                                        <button
                                          onClick={() => setMenuOpen(menuOpen === slot.slot_id ? null : slot.slot_id)}
                                          className="rounded-md p-1 text-ink/30 transition-colors hover:bg-black/5 hover:text-ink/60"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </button>
                                        {menuOpen === slot.slot_id && (
                                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-black/[0.08] bg-white py-1 shadow-lift">
                                            <button
                                              onClick={() => toggleSlot(slot)}
                                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink/70 hover:bg-black/5"
                                            >
                                              <Power className="h-3.5 w-3.5" />
                                              {slot.is_open ? "Close slot" : "Open slot"}
                                            </button>
                                            <button
                                              onClick={() => {
                                                setMenuOpen(null);
                                                setToDeleteSlot({ period, slotId: slot.slot_id });
                                              }}
                                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              Delete slot
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Booking Count */}
                                    <div className="mb-3 text-center">
                                      <p className={`text-2xl font-extrabold ${
                                        closed ? "text-ink/30" : full ? "text-red-500" : "text-ink"
                                      }`}>
                                        {slot.booked}
                                        <span className="text-base font-semibold text-ink/25"> / {slot.capacity}</span>
                                      </p>
                                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        closed
                                          ? "bg-black/5 text-ink/40"
                                          : full
                                            ? "bg-red-50 text-red-500"
                                            : "bg-green-50 text-green-600"
                                      }`}>
                                        {closed ? "Closed" : full ? "Full" : "Available"}
                                      </span>
                                    </div>

                                    {/* View Bookings */}
                                    <button
                                      onClick={() => toggleBookings(period, slot)}
                                      className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-gold-deep transition-colors hover:bg-gold/10"
                                    >
                                      {expanded ? (
                                        <>Hide bookings <ChevronUp className="h-3.5 w-3.5" /></>
                                      ) : (
                                        <>View bookings <ChevronRight className="h-3.5 w-3.5" /></>
                                      )}
                                    </button>
                                  </div>

                                  {/* Expanded Bookings */}
                                  {expanded && (
                                    <div className="mt-1 rounded-xl border border-t-0 border-black/[0.06] bg-paper/50 px-4 py-3">
                                      {slotBookingsLoading ? (
                                        <p className="py-2 text-center text-xs text-ink/40">Loading...</p>
                                      ) : slotBookings.length === 0 ? (
                                        <p className="py-2 text-center text-xs text-ink/40">No bookings yet</p>
                                      ) : (
                                        <div className="space-y-2">
                                          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
                                            Bookings ({slotBookings.length})
                                          </p>
                                          {slotBookings.map((b) => {
                                            const student = one(b.students);
                                            const profile = one(student?.profiles);
                                            const evalDone = b.evaluation_status === "done";
                                            const completedAt = b.evaluation_completed_at
                                              ? new Date(b.evaluation_completed_at)
                                              : null;
                                            const completedDate = completedAt
                                              ? formatDate(completedAt)
                                              : null;
                                            const completedTime = completedAt
                                              ? completedAt.toLocaleTimeString("en-US", {
                                                  hour: "numeric",
                                                  minute: "2-digit",
                                                })
                                              : null;

                                            if (evalDone) {
                                              return (
                                                <div
                                                  key={b.id}
                                                  className="rounded-lg border border-green-200 bg-green-50/50 px-4 py-3"
                                                >
                                                  {/* Status + Unmark */}
                                                  <div className="flex items-center justify-between">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                                      Evaluation Done
                                                    </span>
                                                    <button
                                                      onClick={() => unmarkDone(b.id)}
                                                      disabled={markingEval === b.id}
                                                      className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
                                                    >
                                                      <XCircle className="h-3 w-3" />
                                                      {markingEval === b.id ? "..." : "Unmark"}
                                                    </button>
                                                  </div>

                                                  {/* Student info */}
                                                  <p className="mt-2 text-sm font-semibold text-ink">
                                                    {cleanName(profile?.full_name) || "Student"}
                                                  </p>
                                                  <p className="text-[11px] text-ink/50">
                                                    {regNoDisplay(student?.registration_no, student?.profiles?.email)}
                                                  </p>

                                                  {/* Date + Time */}
                                                  {(completedDate || completedTime) && (
                                                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-green-200/60 pt-2 sm:grid-cols-2">
                                                      {completedDate && (
                                                        <div>
                                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                                                            Evaluation Date
                                                          </p>
                                                          <p className="text-xs font-medium text-ink">
                                                            {completedDate}
                                                          </p>
                                                        </div>
                                                      )}
                                                      {completedTime && (
                                                        <div>
                                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                                                            Evaluation Time
                                                          </p>
                                                          <p className="text-xs font-medium text-ink">
                                                            {completedTime}
                                                          </p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            }

                                            return (
                                              <div
                                                key={b.id}
                                                className="flex items-center justify-between rounded-lg border border-black/[0.05] bg-white px-3 py-2"
                                              >
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-semibold text-ink">
                                                    {cleanName(profile?.full_name) || "Student"}
                                                  </p>
                                                  <p className="text-[11px] text-ink/45">
                                                    {regNoDisplay(student?.registration_no, student?.profiles?.email)}
                                                  </p>
                                                </div>
                                                <button
                                                  onClick={() => markDone(b.id)}
                                                  disabled={markingEval === b.id}
                                                  className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 text-[11px] font-semibold text-gold-deep transition-colors hover:bg-gold/25 disabled:opacity-50"
                                                >
                                                  <CircleDot className="h-3 w-3" />
                                                  {markingEval === b.id ? "..." : "Mark Done"}
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Create period modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New evaluation period">
        <form onSubmit={createPeriod} className="space-y-4">
          <div>
            <label className="label">Section</label>
            <select name="section_id" className="input" required defaultValue="">
              <option value="" disabled>Select a section</option>
              {sections.map((s) => {
                const course = one(s.course);
                return (
                  <option key={s.id} value={s.id}>
                    {course?.code ?? "Course"} → {s.section_code}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input name="title" className="input" placeholder="e.g. Assignment 1 Evaluation" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Starts</label>
              <input name="starts_on" type="date" className="input" required />
            </div>
            <div>
              <label className="label">Ends</label>
              <input name="ends_on" type="date" className="input" required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary">Create period</button>
          </div>
        </form>
      </Modal>

      {/* Add slot modal */}
      <Modal open={!!slotFor} onClose={() => setSlotFor(null)} title={`Add slot · ${slotFor?.title ?? ""}`}>
        <form onSubmit={addSlot} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input name="slot_date" type="date" className="input" required min={slotFor?.starts_on} max={slotFor?.ends_on} />
            </div>
            <div>
              <label className="label">Start time</label>
              <input name="start_time" type="time" className="input" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">End time</label>
              <input name="end_time" type="time" className="input" required />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input name="capacity" type="number" min={1} defaultValue={1} className="input" required />
              <p className="mt-1 text-[11px] text-ink/40">Max students per slot</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setSlotFor(null)}>Cancel</button>
            <button className="btn-primary">Add slot</button>
          </div>
        </form>
      </Modal>

      {/* Auto-generate modal */}
      <Modal open={!!genFor} onClose={() => setGenFor(null)} title={`Auto-generate · ${genFor?.title ?? ""}`}>
        <form onSubmit={generateSlots} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From</label>
              <input name="from_date" type="date" className="input" required defaultValue={genFor?.starts_on} min={genFor?.starts_on} max={genFor?.ends_on} />
            </div>
            <div>
              <label className="label">To</label>
              <input name="to_date" type="date" className="input" required defaultValue={genFor?.ends_on} min={genFor?.starts_on} max={genFor?.ends_on} />
            </div>
          </div>
          <div>
            <label className="label">Days of the week</label>
            <div className="flex gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <label key={d} className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-black/[0.08] px-2 py-1.5 text-[11px] font-medium text-ink/60">
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={i}
                    defaultChecked={i >= 1 && i <= 5}
                    className="h-3.5 w-3.5 accent-[#F5C518]"
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start time</label>
              <input name="start_time" type="time" className="input" defaultValue="09:00" required />
            </div>
            <div>
              <label className="label">End time</label>
              <input name="end_time" type="time" className="input" defaultValue="17:00" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Slot length (min)</label>
              <input name="duration" type="number" min={5} step={5} defaultValue={30} className="input" required />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input name="capacity" type="number" min={1} defaultValue={1} className="input" required />
            </div>
          </div>
          <div className="rounded-xl bg-gold/10 p-3 text-xs leading-relaxed text-ink/55">
            <p className="font-semibold text-gold-deep">How it works</p>
            One slot per time step on each selected day. Duplicates are skipped automatically.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setGenFor(null)}>Cancel</button>
            <button className="btn-primary" disabled={genBusy}>
              <Wand2 className="h-4 w-4" /> {genBusy ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toClose}
        onClose={() => setToClose(null)}
        onConfirm={closePeriod}
        title={`Close "${toClose?.title}"?`}
        message="Students will no longer be able to book or cancel slots for this period."
        confirmLabel="Close period"
      />
      <ConfirmDialog
        open={!!toReopen}
        onClose={() => setToReopen(null)}
        onConfirm={reopenPeriod}
        title={`Reopen "${toReopen?.title}"?`}
        message="Students will be able to book and switch slots again."
        confirmLabel="Reopen period"
      />
      <ConfirmDialog
        open={!!toDeleteAllSlots}
        onClose={() => setToDeleteAllSlots(null)}
        onConfirm={deleteAllSlots}
        title={`Delete all slots of "${toDeleteAllSlots?.title}"?`}
        message={`All ${toDeleteAllSlots?.slots.length ?? 0} slots and their bookings will be removed. This cannot be undone.`}
        confirmLabel="Delete all slots"
      />
      <ConfirmDialog
        open={!!toDeletePeriod}
        onClose={() => setToDeletePeriod(null)}
        onConfirm={deletePeriod}
        title={`Delete "${toDeletePeriod?.title}"?`}
        message="The period, all slots and all bookings will be permanently removed."
        confirmLabel="Delete period"
      />
      <ConfirmDialog
        open={!!toDeleteSlot}
        onClose={() => setToDeleteSlot(null)}
        onConfirm={deleteSlot}
        title="Delete this slot?"
        message="The slot and its bookings will be removed."
        confirmLabel="Delete slot"
      />
    </div>
  );
}
