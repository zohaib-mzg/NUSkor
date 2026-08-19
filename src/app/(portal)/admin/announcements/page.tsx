"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AdminAnnouncementsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Announcement[]>([]);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; item: Announcement } | null
  >(null);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements as unknown as {
      title: HTMLInputElement;
      body: HTMLTextAreaElement;
      is_published: HTMLInputElement;
    };
    const title = el.title.value.trim();
    const body = el.body.value.trim();
    const is_published = el.is_published.checked;
    if (!title || !body) return;

    const supabase = createClient();
    if (modal?.mode === "create") {
      const { error: err } = await supabase
        .from("announcements")
        .insert({ title, body, is_published });
      if (err) return error(err.message);
      success("Announcement created.");
    } else if (modal?.mode === "edit" && modal.item) {
      const { error: err } = await supabase
        .from("announcements")
        .update({ title, body, is_published })
        .eq("id", modal.item.id);
      if (err) return error(err.message);
      success("Announcement updated.");
    }
    setModal(null);
    load();
  }

  async function togglePublish(item: Announcement) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("announcements")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);
    if (err) return error(err.message);
    success(item.is_published ? "Unpublished." : "Published to students.");
    load();
  }

  async function deleteItem() {
    if (!toDelete) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("announcements")
      .delete()
      .eq("id", toDelete.id);
    if (err) return error(err.message);
    success("Announcement deleted.");
    setToDelete(null);
    load();
  }

  if (loading) return <Spinner label="Loading announcements..." />;

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Publish updates that instantly reach every student."
        icon={Megaphone}
        actions={
          <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
            <Plus className="h-4 w-4" /> New announcement
          </button>
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
                      {formatDate(a.created_at, true)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={a.is_published ? "green" : "neutral"}>
                    {a.is_published ? "Published" : "Draft"}
                  </Badge>
                  <button
                    onClick={() => togglePublish(a)}
                    className="btn-outline px-3 py-1.5 text-xs"
                  >
                    {a.is_published ? (
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
          <label className="flex items-center gap-2 text-sm font-medium text-ink/80">
            <input
              name="is_published"
              type="checkbox"
              defaultChecked={modal?.mode === "edit" ? modal.item.is_published : true}
              className="h-4 w-4 accent-[#F5C518]"
            />
            Publish immediately
          </label>
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
        title={`Delete "${toDelete?.title}"?`}
        message="Students will no longer see this announcement. This cannot be undone."
      />
    </div>
  );
}