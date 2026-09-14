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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyAll } from "@/lib/push";
import type { CourseSection, EvaluationPeriod, SlotWithBookings } from "@/lib/types";
import { formatDate, formatSlotRange, formatCompactPeriodDate, one } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface PeriodAdmin extends EvaluationPeriod {
  slots: SlotWithBookings[];
}

export default function EvaluationPeriodsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [periods, setPeriods] = useState<PeriodAdmin[]>([]);
  const [modal, setModal] = useState(false);
  const [slotFor, setSlotFor] = useState<PeriodAdmin | null>(null);
  const [genFor, setGenFor] = useState<PeriodAdmin | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [toClose, setToClose] = useState<PeriodAdmin | null>(null);
  const [toDeleteSlot, setToDeleteSlot] = useState<{
    period: PeriodAdmin;
    slotId: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    const [sRes, pRes] = await Promise.all([
      supabase
        .from("course_sections")
        .select("*, course:courses(code, title)")
        .eq("status", "active")
        .order("section_code"),
      supabase
        .from("evaluation_periods")
        .select("*, section:course_sections(section_code, course:courses(code, title))")
        .order("starts_on", { ascending: false }),
    ]);
    if (!sRes.error) setSections((sRes.data ?? []) as CourseSection[]);
    if (!pRes.error) {
      const raw = (pRes.data ?? []) as EvaluationPeriod[];
      const withSlots = await Promise.all(
        raw.map(async (p) => {
          const { data } = await supabase.rpc("get_slots_with_counts", {
            p_period_id: p.id,
          });
          return { ...p, slots: (data ?? []) as SlotWithBookings[] };
        })
      );
      setPeriods(withSlots);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
                    {!period.is_closed && (
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
                    <EmptyState title="No slots yet" description="Add time slots so students can book." />
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
                              return (
                                <div
                                  key={slot.slot_id}
                                  className={`relative rounded-xl border p-4 transition-all ${
                                    closed
                                      ? "border-black/[0.06] bg-paper/60 opacity-70"
                                      : full
                                        ? "border-gold/40 bg-white shadow-card"
                                        : "border-gold/30 bg-white shadow-card hover:shadow-lift"
                                  }`}
                                >
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
