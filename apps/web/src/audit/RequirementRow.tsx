import { useId, useState, type ReactNode } from "react";
import { courseKey, sameCourse } from "@gradguide/shared";
import { EXAM_PSEUDO_ID } from "@gradguide/engine";
import type { CourseId, ExternalCredit, Requirement, Result } from "@gradguide/shared";
import { STATUS_WORD, StatusGlyph, verdictOf } from "./StatusGlyph.tsx";
import { ProgressCount } from "./ProgressCount.tsx";

/**
 * One line of the audit, and the signature element: on the left the verdict and
 * what closed it, on the right the College's own sentence. The layout reserves
 * the margin on every row, so the page cannot show a verdict without its reason.
 */
export function RequirementRow({
  requirement,
  result,
  externalCredits,
  startsCluster,
  detail,
}: {
  requirement: Requirement;
  result: Result;
  externalCredits: ExternalCredit[];
  startsCluster: boolean;
  detail: (open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const verdict = verdictOf(result);
  const override = result.viaOverride ? requirement : null;

  return (
    <li className={`row row-${verdict}${startsCluster ? " row-cluster" : ""}`} data-status={verdict}>
      <div className="row-main">
        <span className="row-status">
          <StatusGlyph status={verdict} />
          <span className="row-word">{STATUS_WORD[verdict]}</span>
        </span>

        <span className="row-label">
          <button
            type="button"
            className="row-expand"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((o) => !o)}
          >
            {requirement.label}
          </button>
        </span>

        <span className="row-answer">
          {result.satisfiedBy.length > 0 ? (
            result.satisfiedBy.map((id) => (
              <span key={courseKey(id)} className="course-code">
                {describeSatisfier(id, externalCredits)}
              </span>
            ))
          ) : result.remaining && result.remaining.n > 0 ? (
            <span className="row-owed">{describeRemaining(result.remaining)}</span>
          ) : null}
        </span>

        <span className="row-extra">
          {isCountable(requirement, result) && (
            <ProgressCount have={countHave(result)} need={countNeed(requirement)} noun="" />
          )}
          {result.candidates.length > 0 && (
            <span className="row-candidates">{result.candidates.length} could satisfy this</span>
          )}
          {override && <span className="row-manual">override</span>}
          {result.viaAttestation && <span className="row-manual">attested</span>}
          {result.confidence && result.confidence !== "verified" && (
            <span className="row-confidence" title="How confident we are in this encoding of the rule">
              {result.confidence}
            </span>
          )}
        </span>
      </div>

      <aside className="row-evidence">
        <blockquote className="quote">
          {result.status === "unverifiable" && result.note ? result.note : requirement.sourceQuote}
        </blockquote>
        {result.status !== "unverifiable" && result.note && <p className="row-note">{result.note}</p>}
      </aside>

      <div id={detailId} className="row-detail" hidden={!open}>
        {detail(open)}
      </div>
    </li>
  );
}

/** An exam reports as the EXAM pseudo-id; the student needs its name. */
function describeSatisfier(id: CourseId, externalCredits: ExternalCredit[]): string {
  if (!sameCourse(id, EXAM_PSEUDO_ID)) return courseKey(id);
  const exam = externalCredits.find((c) => c.qualifies && c.grantsAttributes.length > 0);
  return exam ? exam.label : "an exam";
}

export function describeRemaining(remaining: { n: number; unit: "courses" | "credits" }): string {
  const unit = remaining.n === 1 ? remaining.unit.replace(/s$/, "") : remaining.unit;
  return `${remaining.n} more ${unit}`;
}

/** "n of m" only where m is a real number the catalog states. */
function isCountable(requirement: Requirement, result: Result): boolean {
  return (
    requirement.rule.kind === "attribute" &&
    (requirement.rule.unit ?? "courses") === "courses" &&
    requirement.rule.n > 1 &&
    !result.waived
  );
}

function countNeed(requirement: Requirement): number {
  return requirement.rule.kind === "attribute" ? requirement.rule.n : 0;
}

function countHave(result: Result): number {
  return result.satisfiedBy.length;
}
