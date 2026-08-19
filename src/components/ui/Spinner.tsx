export default function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink/50">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gold border-t-ink/20" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}