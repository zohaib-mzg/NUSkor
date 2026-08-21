"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import { formatDate, one } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("announcements")
        .select("*, profiles(full_name), section:course_sections(section_code, course:courses(code))")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (!cancelled && data) setItems(data as Announcement[]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading announcements..." />;

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Everything your TA has shared, newest first."
        icon={Megaphone}
      />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No announcements yet"
            description="When the TA publishes something, it will show up here."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a, idx) => (
            <article
              key={a.id}
              className="card p-6 transition-shadow hover:shadow-lift"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold-deep">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-ink">{a.title}</h2>
                  <p className="text-xs text-ink/50">
                    {formatDate(a.published_at ?? a.created_at, true)}
                    {a.profiles?.full_name ? ` · by ${a.profiles.full_name}` : ""}
                    {a.section_id &&
                      (() => {
                        const sec = one(a.section);
                        return sec
                          ? ` ${String.fromCharCode(0x2192)} ${sec.course?.code ?? "Course"} ${sec.section_code}`
                          : "";
                      })()}
                  </p>
                </div>
                {idx === 0 && <Badge tone="gold">New</Badge>}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">
                {a.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}