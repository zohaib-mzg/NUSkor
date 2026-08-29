"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-ink/70">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-outline" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}