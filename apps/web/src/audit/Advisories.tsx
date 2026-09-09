import type { Program } from "@gradguide/shared";

/**
 * Rules the engine does not evaluate. They are shown because they are real
 * requirements a student can trip over, and marked as unchecked because
 * pretending otherwise is exactly the failure this product exists to avoid.
 */
export function Advisories({ program }: { program: Program }) {
  const advisories = program.advisories ?? [];
  if (advisories.length === 0) return null;

  return (
    <section className="advisories" aria-labelledby={`advisories-${program.id}`}>
      <h3 id={`advisories-${program.id}`}>Not checked here</h3>
      <p className="advisories-intro">
        These come from the same catalog pages but need judgment or a term-by-term
        plan, so this tool does not check them. Read them yourself.
      </p>
      <ul className="rows">
        {advisories.map((advisory) => (
          <li key={advisory.id} className="row advisory-row">
            <div className="row-main">
              <span className="row-label">{advisory.label}</span>
              <span className="advisory-text">{advisory.text}</span>
            </div>
            <aside className="row-evidence">
              <blockquote className="quote">{advisory.sourceQuote}</blockquote>
            </aside>
          </li>
        ))}
      </ul>
    </section>
  );
}
