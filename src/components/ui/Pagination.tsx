import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  totalCount,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onGoTo,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 2) pages.push("...");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 3) pages.push("...");
    pages.push(totalPages - 1);
  }

  return (
    <div className="flex items-center justify-between border-t border-black/[0.06] bg-white px-5 py-3">
      <p className="text-xs text-ink/50">
        {totalCount} total · Page {page + 1} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="rounded-lg p-1.5 text-ink/50 hover:bg-black/5 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1.5 text-xs text-ink/30">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onGoTo(p)}
              className={cn(
                "min-w-[28px] rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
                p === page
                  ? "bg-gold text-ink"
                  : "text-ink/50 hover:bg-black/5"
              )}
            >
              {p + 1}
            </button>
          )
        )}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="rounded-lg p-1.5 text-ink/50 hover:bg-black/5 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
