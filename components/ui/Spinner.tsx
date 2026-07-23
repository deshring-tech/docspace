export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="w-4 h-4 rounded-full border-2 border-edge border-t-accent animate-spin" />
      {label}
    </span>
  );
}
