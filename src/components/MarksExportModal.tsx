"use client";

import { useState } from "react";
import { FileDown, Loader2, CheckSquare, Square } from "lucide-react";
import type { Assessment } from "@/lib/types";
import Modal from "@/components/ui/Modal";

interface MarksExportModalProps {
  open: boolean;
  onClose: () => void;
  assessments: Assessment[];
  sectionLabel: string;
  onExport: (selectedIds: string[]) => Promise<void>;
}

export default function MarksExportModal({
  open,
  onClose,
  assessments,
  sectionLabel,
  onExport,
}: MarksExportModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === assessments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assessments.map((a) => a.id)));
    }
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await onExport(Array.from(selected));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Export Excel" wide>
      <div className="space-y-5">
        <div className="rounded-lg bg-gold/10 p-3 text-sm text-ink/70">
          Exporting marks for{" "}
          <span className="font-bold text-ink">{sectionLabel}</span>.
          Select which assessments to include in the Excel file.
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
            Assessments ({selected.size}/{assessments.length})
          </p>
          <button
            className="text-xs font-semibold text-gold-deep hover:underline"
            onClick={toggleAll}
          >
            {selected.size === assessments.length ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-2">
          {assessments.map((a) => {
            const checked = selected.has(a.id);
            return (
              <button
                key={a.id}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-paper"
                onClick={() => toggle(a.id)}
              >
                {checked ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-gold-deep" />
                ) : (
                  <Square className="h-4 w-4 shrink-0 text-ink/25" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <p className="text-xs text-ink/50">
                    {a.type} · {a.total_marks} marks
                  </p>
                </div>
              </button>
            );
          })}
          {assessments.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-ink/40">
              No assessments in this section.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={busy || selected.size === 0}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export {selected.size} assessment{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </Modal>
  );
}
