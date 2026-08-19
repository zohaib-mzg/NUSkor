"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Plus,
  Clock,
  Power,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseSection, EvaluationPeriod, SlotWithBookings } from "@/lib/types";
import { formatDate, one } from "@/lib/utils";
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
  const [toClose, setToClose] = useState<PeriodAdmin | null>(null);
  const [toDeleteSlot, setToDeleteSlot] = useState<{
    period: PeriodAdmin;
    slotId: string;
  } | null>(null);

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
    const { error: err } = await supabase.from("evaluation_periods").insert(payload);
    if (err) return error(err.message);
    success("Evaluation period created.");
    setModal(false);
    load();
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
                            {sec.course?.code} · Section {sec.section_code}
                          </>
                        ) : (
                          "Unknown section"
                        );
                      })()}{" "}
                      · {formatDate(period.starts_on)} to {formatDate(period.ends_on)} ·{" "}
                      {period.slots.length} slots · {totalBooked} bookings
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!period.is_closed && (
                      <button
                        className="btn-outline px-3 py-1.5 text-xs"
                        onClick={() => setSlotFor(period)}
                      >
                        <Clock className="h-3.5 w-3.5" /> Add slot
                      </button>
                    )}
                    {!period.is_closed && (
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
                    <table className="w-full min-w-[560px]">
                      <thead className="bg-paper">
                        <tr>
                          <th className="th">Date</th>
                          <th className="th">Time</th>
                          <th className="th">Booked</th>
                          <th className="th text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {period.slots.map((slot) => {
                          const full = slot.booked >= slot.capacity;
                          return (
                            <tr key={slot.slot_id} className="bg-white">
                              <td className="td font-semibold text-ink">
                                {formatDate(slot.slot_date)}
                              </td>
                              <td className="td">
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
                    {course?.code ?? "Course"} · Section {s.section_code}
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

      <ConfirmDialog
        open={!!toClose}
        onClose={() => setToClose(null)}
        onConfirm={closePeriod}
        title={`Close "${toClose?.title}"?`}
        message="Students will no longer be able to book or cancel slots for this period. Existing bookings stay confirmed."
        confirmLabel="Close period"
      />

      <ConfirmDialog
        open={!!toDeleteSlot}
        onClose={() => setToDeleteSlot(null)}
        onConfirm={deleteSlot}
        title="Delete this slot?"
        message="The slot and any bookings on it will be removed. Students with bookings on this slot will need to book again."
        confirmLabel="Delete slot"
      />
    </div>
  );
}