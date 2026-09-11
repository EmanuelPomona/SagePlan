/**
 * A count, and only where the count is real. There is no overall percentage
 * anywhere in this app, because no such number exists: "72% of a degree" is a
 * number nobody can act on and everybody misreads.
 */
export function ProgressCount({ have, need, noun }: { have: number; need: number; noun: string }) {
  // Just the number. A filled track behind a partial fill is dashboard
  // furniture, and this page is a document: "5 of 6" already says it, and the
  // bar was the only thing here that looked like an analytics panel.
  return (
    <span className="progress-count">
      <strong>{have}</strong> of <strong>{need}</strong> {noun}
    </span>
  );
}
