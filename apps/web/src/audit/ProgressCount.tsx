/**
 * A count, and only where the count is real. There is no overall percentage
 * anywhere in this app, because no such number exists: "72% of a degree" is a
 * number nobody can act on and everybody misreads.
 */
export function ProgressCount({ have, need, noun }: { have: number; need: number; noun: string }) {
  const pct = need === 0 ? 0 : Math.min(100, (have / need) * 100);
  return (
    <span className="progress-count">
      <span className="progress-figures">
        <strong>{have}</strong> of <strong>{need}</strong> {noun}
      </span>
      <span className="progress-track" aria-hidden="true">
        <span className="progress-fill" style={{ inlineSize: `${pct}%` }} />
      </span>
    </span>
  );
}
