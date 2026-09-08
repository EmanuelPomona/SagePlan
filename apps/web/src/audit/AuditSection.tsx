import { courseKey } from "@gradguide/shared";
import type { Program, Requirement, Result } from "@gradguide/shared";
import { STATUS_WORD, StatusGlyph, verdictOf } from "./StatusGlyph.tsx";

/**
 * The audit: one ruled row per requirement, with the catalog's own sentence in
 * the margin beside it.
 *
 * Nothing here knows what general education is. Grouping comes from the rule
 * kinds in the data and from the program's own constraints, so a major encoded
 * later renders through exactly this path (docs/ARCHITECTURE.md, rule 1).
 */
export function AuditSection({ programs, results }: { programs: Program[]; results: Result[] }) {
  return (
    <section className="section" aria-labelledby="audit-heading">
      <div className="section-head">
        <h2 id="audit-heading">Your requirements</h2>
      </div>
      {programs.map((program) => (
        <ProgramAudit
          key={program.id}
          program={program}
          results={results.filter((r) => r.programId === program.id)}
        />
      ))}
    </section>
  );
}

function ProgramAudit({ program, results }: { program: Program; results: Result[] }) {
  const byId = new Map(program.requirements.map((r) => [r.id, r]));

  return (
    <div className="program">
      <ProgramSummary program={program} results={results} />
      <ol className="rows">
        {results.map((result, index) => {
          const requirement = byId.get(result.requirementId);
          if (!requirement) return null;
          const previous = index > 0 ? byId.get(results[index - 1]!.requirementId) : undefined;
          const startsCluster = previous !== undefined && previous.rule.kind !== requirement.rule.kind;
          return (
            <RequirementRow
              key={result.requirementId}
              requirement={requirement}
              result={result}
              startsCluster={startsCluster}
            />
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Counts, and only counts that are real. A group named by a distinctDepartments
 * constraint is a real group in the data, so "n of m" over it means something;
 * there is no overall percentage anywhere, because no such number exists.
 */
function ProgramSummary({ program, results }: { program: Program; results: Result[] }) {
  const open = results.filter((r) => r.status === "unmet" || r.status === "partial").length;
  const group = program.constraints?.find((c) => c.kind === "distinctDepartments");
  const grouped = group
    ? results.filter((r) => group.requirementIds.includes(r.requirementId) && !r.waived)
    : [];
  const groupSatisfied = grouped.filter((r) => r.status === "satisfied").length;

  return (
    <p className="summary" role="status">
      {grouped.length > 0 && (
        <span className="summary-count">
          <strong>
            {groupSatisfied} of {grouped.length}
          </strong>{" "}
          breadth areas
        </span>
      )}
      <span className="summary-count">
        <strong>{open}</strong> {open === 1 ? "requirement" : "requirements"} still open
      </span>
    </p>
  );
}

/** "1 more course", "2 more courses", "0.5 more credits". */
function describeRemaining(remaining: { n: number; unit: "courses" | "credits" }): string {
  const unit = remaining.n === 1 ? remaining.unit.replace(/s$/, "") : remaining.unit;
  return `${remaining.n} more ${unit}`;
}

function RequirementRow({
  requirement,
  result,
  startsCluster,
}: {
  requirement: Requirement;
  result: Result;
  startsCluster: boolean;
}) {
  const satisfiedBy = result.satisfiedBy.map(courseKey);
  const verdict = verdictOf(result);

  return (
    <li className={`row row-${verdict}${startsCluster ? " row-cluster" : ""}`}>
      <div className="row-main">
        <span className="row-status">
          <StatusGlyph status={verdict} />
          <span className="row-word">{STATUS_WORD[verdict]}</span>
        </span>

        <span className="row-label">{requirement.label}</span>

        <span className="row-answer">
          {satisfiedBy.length > 0 ? (
            satisfiedBy.map((key) => (
              <span key={key} className="course-code">
                {key}
              </span>
            ))
          ) : result.remaining && result.remaining.n > 0 ? (
            <span className="row-owed">{describeRemaining(result.remaining)}</span>
          ) : null}
        </span>

        {result.candidates.length > 0 && (
          <span className="row-candidates">
            {result.candidates.length} could satisfy this
          </span>
        )}

        {result.confidence && result.confidence !== "verified" && (
          <span className="row-confidence" title="How confident we are in this encoding of the rule">
            {result.confidence}
          </span>
        )}
      </div>

      {/* The margin of evidence: the College's own sentence, on every row. */}
      <aside className="row-evidence">
        <blockquote className="quote">{requirement.sourceQuote}</blockquote>
        {result.note && <p className="row-note">{result.note}</p>}
      </aside>
    </li>
  );
}
