"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Search, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types";
import { cleanName, formatDate, one, regNoDisplay } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { usePagination } from "@/lib/hooks/usePagination";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";

export default function BookingsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const pagination = usePagination();

  const load = useCallback(async (page = 0, search = "") => {
    setLoading(true);
    const supabase = createClient();
    const from = page * pagination.PAGE_SIZE;
    const to = from + pagination.PAGE_SIZE - 1;

    let queryBuilder = supabase
      .from("bookings")
      .select(
        "*, evaluation_slots(slot_date, start_time, end_time), evaluation_periods(title, section:course_sections(section_code, course:courses(code))), students(registration_no, profiles(full_name, email))",
        { count: "exact" }
      );

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      queryBuilder = queryBuilder.or(
        `students.registration_no.ilike.%${q}%,students.profiles.full_name.ilike.%${q}%,students.profiles.email.ilike.%${q}%,evaluation_periods.title.ilike.%${q}%`
      );
    }

    const { data, error: err, count } = await queryBuilder
      .order("created_at", { ascending: false })
      .range(from, to);
    if (err) {
      setLoading(false);
      return error(err.message);
    }
    setBookings((data ?? []) as Booking[]);
    pagination.setTotalCount(count ?? 0);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    load(newPage, query);
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    load(0, q);
  };

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
    load(pagination.page, query);
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
              onChange={(e) => handleSearch(e.target.value)}
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
                  <th className="th">Reg. No.</th>
                  <th className="th">Student</th>
                  <th className="th">Course → Section</th>
                  <th className="th">Evaluation</th>
                  <th className="th">Slot</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const student = one(b.students);
                  const profile = one(student?.profiles);
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
                      <p className="font-semibold text-ink">
                        {b.evaluation_periods?.section?.course?.code ?? "Course"}
                      </p>
                      <p className="text-xs text-ink/50">
                        Section {b.evaluation_periods?.section?.section_code ?? ""}
                      </p>
                    </td>
                    <td className="td">
                      <p className="font-semibold text-ink">
                        {b.evaluation_periods?.title ?? "N/A"}
                      </p>
                    </td>
                    <td className="td text-ink/70">
                      {b.evaluation_slots
                        ? `${formatDate(b.evaluation_slots.slot_date)}, ${b.evaluation_slots.start_time}–${b.evaluation_slots.end_time}`
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.totalCount}
            hasPrev={pagination.hasPrev}
            hasNext={pagination.hasNext}
            onPrev={() => handlePageChange(pagination.page - 1)}
            onNext={() => handlePageChange(pagination.page + 1)}
            onGoTo={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}