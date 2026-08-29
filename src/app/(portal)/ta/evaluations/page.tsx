"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Plus,
  Clock,
  Power,
  Trash2,
  Wand2,
  CalendarCheck2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyAll } from "@/lib/push";
import type {
  Booking,
  CourseSection,
  EvaluationPeriod,
  SlotWithBookings,
} from "@/lib/types";
import { cleanName, formatDate, one, regNoDisplay } from "@/lib/utils";
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

export default function TaEvaluationPeriodsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [periods, setPeriods] = useState<PeriodAdmin[]>([]);
  const [modal, setModal] = useState(false);
  const [slotFor, setSlotFor] = useState<PeriodAdmin | null>(null);
const [genFor, setGenFor] = useState<PeriodAdmin | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [bookingsFor, setBookingsFor] = useState<PeriodAdmin | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [toClose, setToClose] = useState<PeriodAdmin | null>(null);
  const [toReopen, setToReopen] = useState<PeriodAdmin | null>(null);
  const [toDeleteAllSlots, setToDeleteAllSlots] = useState<PeriodAdmin | null>(null);
  const [toDeletePeriod, setToDeletePeriod] = useState<PeriodAdmin | null>(null);
  const [toDeleteSlot, setToDeleteSlot] = useState<{
    period: PeriodAdmin;
    slotId: string;
  } | null>(null);

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
    setPeriods(withSlots);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openBookings(period: PeriodAdmin) {
    setBookingsFor(period);
    setBookingsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, evaluation_slots(slot_date, start_time, end_time), students(registration_no, profiles(full_name, email))"
      )
      .eq("evaluation_period_id", period.id)
      .order("created_at", { ascending: false });
    setBookings((data ?? []) as Booking[]);
    setBookingsLoading(false);
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
    const slotDate = el.slot_date.value;
    const startTime = el.start_time.value;
    const endTime = el.end_time.value;
    const capacity = Number(el.capacity.value || 1);

    const supabase = createClient();
    const { error: err } = await supabase.from("evaluation_slots").insert({
      evaluation_period_id: slotFor.id,
      slot_date: slotDate,
      start_time: startTime,
      end_time: endTime,
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
    success(
      `Deleted ${count ?? 0} slot${(count ?? 0) === 1 ? "" : "s"} (and any bookings on them).`
    );
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
        subtitle="Create periods, add time slots, and let students book."
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
            description='Create one, e.g. "Assignment 1 Evaluation, May 21 to 23", then add slots.'
          />
        </div>
      ) : (
        <div className="space-y-6">
          {periods.map((period) => {
            const totalBooked = period.slots.reduce((s, sl) => s + sl.booked, 0);
            return (
              <section
                key={period.id}
                className={`card overflow-hidden ${period.is_closed ? "opacity-80" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-ink">{period.title}</h2>
                      <Badge tone={period.is_closed ? "neutral" : "gold"}>
                        {period.is_closed ? "Closed" : "Open"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink/55">
                      {(() => {
                        const sec = one(period.section);
                        return sec ? (
                          <>
                            {sec.course?.code} → {sec.section_code}
                          </>
                        ) : (
                          "Unknown section"
                        );
                      })()}{" "}
                      · {formatDate(period.starts_on)} to {formatDate(period.ends_on)} ·{" "}
                      {period.slots.length} slots · {totalBooked} bookings
                    </p>
                  </div>
<div className="flex flex-wrap gap-2">
                    {totalBooked > 0 && (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs"
                        onClick={() => openBookings(period)}
                      >
                        <CalendarCheck2 className="h-3.5 w-3.5" /> Bookings ({totalBooked})
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
                        className="btn-outline px-3 py-1.5 text-xs"
                        onClick={() => setSlotFor(period)}
                      >
                        <Clock className="h-3.5 w-3.5" /> Add slot
                      </button>
                    )}
                    {period.slots.length > 0 && (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                        onClick={() => setToDeleteAllSlots(period)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete all slots
                      </button>
                    )}
                    {period.is_closed ? (
                      <>
                        <button
                          className="btn-outline px-3 py-1.5 text-xs"
                          onClick={() => setToReopen(period)}
                        >
                          <Power className="h-3.5 w-3.5" /> Reopen
                        </button>
                        <button
                          className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                          onClick={() => setToDeletePeriod(period)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete period
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                        onClick={() => setToClose(period)}
                      >
                        <Power className="h-3.5 w-3.5" /> Close period
                      </button>
                    )}
                  </div>
                </div>

                {period.slots.length === 0 ? (
                  <div className="px-5 py-8">
                    <EmptyState
                      title="No slots yet"
                      description="Add date/time slots so students can book."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {(() => {
                      // Group slots by date (data is pre-sorted by slot_date, start_time)
                      const groups: { date: string; slots: SlotWithBookings[] }[] = [];
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
                          <div key={group.date} className={gi > 0 ? "border-t border-black/[0.06]" : ""}>
                            <div className="bg-paper/60 px-5 py-2.5">
                              <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{dayName}</p>
                              <p className="text-sm font-semibold text-ink">{dateLabel}</p>
                            </div>
                            <table className="w-full min-w-[560px]">
                              <thead className="bg-paper/30">
                                <tr>
                                  <th className="th">Time</th>
                                  <th className="th">Booked</th>
                                  <th className="th text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.slots.map((slot) => {
                                  const full = slot.booked >= slot.capacity;
                                  return (
                                    <tr key={slot.slot_id} className="bg-white">
                                      <td className="td font-semibold text-ink">
                                        {slot.start_time}–{slot.end_time}
                                      </td>
                                      <td className="td">
                                        <Badge
                                          tone={
                                            !slot.is_open
                                              ? "neutral"
                                              : full
                                                ? "red"
                                                : "green"
                                          }
                                        >
                                          {slot.booked}/{slot.capacity}{" "}
                                          {!slot.is_open ? "· closed" : full ? "· full" : ""}
                                        </Badge>
                                      </td>
                                      <td className="td">
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => toggleSlot(slot)}
                                            className="btn-outline px-3 py-1.5 text-xs"
                                          >
                                            <Power className="h-3.5 w-3.5" />
                                            {slot.is_open ? "Close" : "Reopen"}
                                          </button>
                                          <button
                                            onClick={() =>
                                              setToDeleteSlot({ period, slotId: slot.slot_id })
                                            }
                                            className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      });
                    })()}
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
              <option value="" disabled>
                Select a section
              </option>
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
            <input
              name="title"
              className="input"
              placeholder="e.g. Assignment 1 Evaluation"
              required
            />
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
            <button type="button" className="btn-outline" onClick={() => setModal(false)}>
              Cancel
            </button>
            <button className="btn-primary">Create period</button>
          </div>
        </form>
      </Modal>

      {/* Add slot modal */}
      <Modal
        open={!!slotFor}
        onClose={() => setSlotFor(null)}
        title={`Add slot · ${slotFor?.title ?? ""}`}
      >
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
            <input
              name="capacity"
              type="number"
              min={1}
              defaultValue={1}
              className="input"
              required
            />
            <p className="mt-1 text-xs text-ink/45">
              Number of students who can book this slot. The database refuses
              overbooking.
            </p>
          </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setSlotFor(null)}>
              Cancel
            </button>
            <button className="btn-primary">Add slot</button>
          </div>
        </form>
      </Modal>

      {/* Auto-generate slots modal */}
      <Modal
        open={!!genFor}
        onClose={() => setGenFor(null)}
        title={`Auto-generate slots · ${genFor?.title ?? ""}`}
      >
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
          <div className="rounded-xl bg-gold/10 p-4 text-xs leading-relaxed text-ink/60">
            <p className="font-semibold text-gold-deep">How it works</p>
            One slot is created for every {`"slot length"`} step on each selected
            day, between the start and end times. Running this again skips
            duplicates — existing bookings are never touched.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setGenFor(null)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={genBusy}>
              <Wand2 className="h-4 w-4" /> {genBusy ? "Generating..." : "Generate slots"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toClose}
        onClose={() => setToClose(null)}
        onConfirm={closePeriod}
        title={`Close "${toClose?.title}"?`}
        message="Students will no longer be able to book or cancel slots for this period. Existing bookings stay confirmed."
        confirmLabel="Close period"
      />

      <ConfirmDialog
        open={!!toReopen}
        onClose={() => setToReopen(null)}
        onConfirm={reopenPeriod}
        title={`Reopen "${toReopen?.title}"?`}
        message="Students will be able to book and switch slots for this period again."
        confirmLabel="Reopen period"
      />

      <ConfirmDialog
        open={!!toDeleteAllSlots}
        onClose={() => setToDeleteAllSlots(null)}
        onConfirm={deleteAllSlots}
        title={`Delete all slots of "${toDeleteAllSlots?.title}"?`}
        message={`All ${toDeleteAllSlots?.slots.length ?? 0} slots will be removed, along with any bookings on them. Affected students will need to book again. This cannot be undone.`}
        confirmLabel="Delete all slots"
      />

      <ConfirmDialog
        open={!!toDeletePeriod}
        onClose={() => setToDeletePeriod(null)}
        onConfirm={deletePeriod}
        title={`Delete "${toDeletePeriod?.title}"?`}
        message="The period, all its slots and all bookings on it will be permanently removed. This cannot be undone."
        confirmLabel="Delete period"
      />

<ConfirmDialog
        open={!!toDeleteSlot}
        onClose={() => setToDeleteSlot(null)}
        onConfirm={deleteSlot}
        title="Delete this slot?"
        message="The slot and any bookings on it will be removed. Students with bookings on this slot will need to book again."
        confirmLabel="Delete slot"
      />

      {/* Bookings list */}
      <Modal
        open={!!bookingsFor}
        onClose={() => setBookingsFor(null)}
        title={`Bookings · ${bookingsFor?.title ?? ""}`}
        wide
      >
        {bookingsLoading ? (
          <Spinner label="Loading bookings..." />
        ) : bookings.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-paper">
                <tr>
                  <th className="th">Reg. No.</th>
                  <th className="th">Student</th>
                  <th className="th">Section</th>
                  <th className="th">Slot</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const student = one(b.students);
                  const profile = one(student?.profiles);
                  const sec = one(bookingsFor?.section);
                  return (
                    <tr key={b.id} className="bg-white">
                      <td className="td font-mono text-xs text-ink/70">
                        {regNoDisplay(student?.registration_no, student?.profiles?.email)}
                      </td>
                      <td className="td">
                        <p className="font-semibold text-ink">
                          {cleanName(profile?.full_name) || "Student"}
                        </p>
                        <p className="text-xs text-ink/50">{profile?.email}</p>
                      </td>
                      <td className="td">
                        {sec
                          ? `${sec.course?.code ?? "Course"} → ${sec.section_code}`
                          : "—"}
                      </td>
                      <td className="td text-ink/70">
                        {b.evaluation_slots
                          ? `${formatDate(b.evaluation_slots.slot_date)}, ${b.evaluation_slots.start_time}–${b.evaluation_slots.end_time}`
                          : "N/A"}
                      </td>
                      <td className="td">
                        <Badge
                          tone={
                            b.status === "confirmed"
                              ? "green"
                              : b.status === "pending"
                                ? "gold"
                                : "red"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
