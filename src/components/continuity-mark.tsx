export function ContinuityMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand" aria-label="Continuity">
      <svg
        className="brand__mark"
        viewBox="0 0 32 32"
        role="img"
        aria-hidden="true"
      >
        <path d="M22.75 8.65a9.5 9.5 0 1 0 .3 14.38" />
        <path d="M18.5 13.25 23.2 8.6l4.55 4.65" />
      </svg>
      {!compact && <span>Continuity</span>}
    </span>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}
