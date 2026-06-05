export default function Loading() {
  return (
    <div className="relative z-10 flex flex-1 items-center justify-center py-32">
      <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Cargando…
      </div>
    </div>
  );
}
