"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyAll } from "@/lib/push";
import type { Announcement, CourseSection } from "@/lib/types";
import { formatDate, one } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import SemesterSelector from "@/components/SemesterSelector";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function TaAnnouncementsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Announcement[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; item: Announcement } | null
  >(null);
const [toDelete, setToDelete] = useState<Announcement | null>(null);

const load = useCallback(async () => {
    const supabase = createClient();
    const { data: stRes } = await supabase
      .from("section_tas")
      .select("section_id, section:course_sections(*, course:courses(code))");
    const rows = (stRes ?? []) as {
      section_id: string;
      section: (CourseSection & { course?: { code: string }[] | null })[];
    }[];
    const secs = rows
      .map((r) => one(r.section))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => s as CourseSection);
    setSections(secs);

    const ids = secs.map((s) => s.id);
    let items: Announcement[] = [];
    if (ids.length > 0) {
      const orClause = `section_id.in.(${ids.join(",")}),section_id.is.null`;
      const aRes = await supabase
        .from("announcements")
        .select("*, section:course_sections(section_code, course:courses(code))")
        .or(orClause)
        .order("created_at", { ascending: false });
      items = (aRes.data ?? []) as Announcement[];
    }
    setItems(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

async function publishNotifications(id: string) {
    try {
      await notifyAll("announcement", id);
    } catch (err) {
      console.error("notification RPC failed", err);
    }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements as unknown as {
      title: HTMLInputElement;
      body: HTMLTextAreaElement;
      section_id: HTMLSelectElement;
      status: HTMLSelectElement;
    };
    const title = el.title.value.trim();
    const body = el.body.value.trim();
    const section_id = el.section_id.value || null;
    const status = el.status.value;
    if (!title || !body) return;

    const supabase = createClient();
    if (modal?.mode === "create") {
      const { data, error: err } = await supabase
        .from("announcements")
        .insert({
          title,
          body,
          section_id,
          status,
          published_at: status === "published" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (err) return error(err.message);
      if (status === "published") await publishNotifications(data.id);
      success("Announcement created.");
    } else if (modal?.mode === "edit" && modal.item) {
      const wasPublished = modal.item.status === "published";
      const { error: err } = await supabase
        .from("announcements")
        .update({
          title,
          body,
          section_id,
          status,
          published_at:
            !wasPublished && status === "published"
              ? new Date().toISOString()
              : modal.item.published_at,
        })
        .eq("id", modal.item.id);
      if (err) return error(err.message);
      if (!wasPublished && status === "published") {
        await publishNotifications(modal.item.id);
      }
      success("Announcement updated.");
    }
    setModal(null);
    load();
  }

  async function togglePublish(item: Announcement) {
    const supabase = createClient();
    const publishing = item.status !== "published";
    const { error: err } = await supabase
      .from("announcements")
      .update({
        status: publishing ? "published" : "draft",
        published_at: publishing ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    if (err) return error(err.message);
    if (publishing) await publishNotifications(item.id);
    success(publishing ? "Published to students." : "Unpublished.");
    load();
  }

async function deleteItem() {
    if (!toDelete) return;
    const supabase = createClient();
    const { error: err } = await supabase.rpc("soft_delete_announcement", {
      p_announcement_id: toDelete.id,
    });
    if (err) return error(err.message);
    success("Announcement deleted.");
    setToDelete(null);
    load();
  }

  if (loading) return <Spinner label="Loading announcements..." />;

  const statusTone = (s: string) =>
    s === "published" ? "green" : s === "draft" ? "neutral" : "red";

  const targetLabel = (a: Announcement) => {
    if (!a.section_id) return "All sections";
    const sec = one(a.section);
    return sec
      ? `${sec.course?.code ?? "Course"} → ${sec.section_code}`
      : "A section";
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Target a section or the whole portal. Publishing notifies every recipient."
        icon={Megaphone}
        actions={
          <>
            <SemesterSelector />
            <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
              <Plus className="h-4 w-4" /> New announcement
            </button>
          </>
        }
      />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No announcements yet"
            description="Publish your first update for the students."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <article key={a.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-gold">
                    <Megaphone className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-bold text-ink">{a.title}</h2>
                    <p className="text-xs text-ink/50">
                      {formatDate(a.created_at, true)} · To:{" "}
                      <span className="font-semibold text-gold-deep">{targetLabel(a)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(a.status) as "green" | "neutral" | "red"}>
                    {a.status}
                  </Badge>
                  {a.section_id && (
                    <>
                      <button
                        onClick={() => togglePublish(a)}
                        className="btn-outline px-3 py-1.5 text-xs"
                      >
                        {a.status === "published" ? (
                          <span className="inline-flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5" /> Unpublish</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Publish</span>
                        )}
                      </button>
                      <button
                        onClick={() => setModal({ mode: "edit", item: a })}
                        className="btn-outline px-3 py-1.5 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setToDelete(a)}
                        className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">
                {a.body}
              </p>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "New announcement" : "Edit announcement"}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              name="title"
              className="input"
              placeholder="e.g. Marks published"
              required
              defaultValue={modal?.mode === "edit" ? modal.item.title : ""}
            />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              name="body"
              className="input min-h-[140px] resize-y"
              placeholder="Write your update for the students..."
              required
              defaultValue={modal?.mode === "edit" ? modal.item.body : ""}
            />
          </div>
          <div>
            <label className="label">Target</label>
            <select
              name="section_id"
              className="input"
              defaultValue={modal?.mode === "edit" ? (modal.item.section_id ?? "") : ""}
            >
              <option value="">All sections (everyone)</option>
              {sections.map((s) => {
                const course = one(s.course);
                return (
                  <option key={s.id} value={s.id}>
                    {course?.code ?? "Course"} → {s.section_code}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-ink/45">
              Students not enrolled in the chosen section won&apos;t see it.
            </p>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              name="status"
              className="input"
              defaultValue={modal?.mode === "edit" ? modal.item.status : "draft"}
            >
              <option value="draft">Draft (save without notifying)</option>
              <option value="published">Published (notify recipients now)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary">Save announcement</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={deleteItem}
        title="Are you sure you want to delete this announcement?"
        message={`"${toDelete?.title}" will be hidden from students, TAs and the portal. Any notifications already delivered stay in student inboxes for history, and this action can be audited.`}
      />
    </div>
  );
}
