import PortalButton from "@/components/public/PortalButton";

/**
 * Mobile-only sticky sign-in bar (prompt §7): the "Student Portal" action
 * stays visible on small screens without crowding the header. Rendered by
 * the public layout on every public page; hidden from `sm` upwards, where
 * the header button takes over.
 */
export default function MobilePortalBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 px-4 pt-3 backdrop-blur sm:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <PortalButton className="btn-primary w-full" />
    </div>
  );
}
