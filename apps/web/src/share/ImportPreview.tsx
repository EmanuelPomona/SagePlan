import { termCode } from "@gradguide/shared";
import type { StudentPlan } from "@gradguide/shared";

/**
 * Replacing a record is destructive, so the student sees what is about to
 * replace theirs before it does.
 */
export function ImportPreview({
  plan,
  source,
  onReplace,
  onCancel,
}: {
  plan: StudentPlan;
  source: string;
  onReplace: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="import-preview" role="dialog" aria-labelledby="import-heading">
      <h4 id="import-heading">Replace your record with this one?</h4>
      <p className="import-source">{source}</p>

      <dl className="import-facts">
        <div><dt>Courses</dt><dd>{plan.completed.length}</dd></div>
        <div><dt>Entered</dt><dd>{termCode(plan.matriculationTerm)}</dd></div>
        <div><dt>Student type</dt><dd>{plan.studentType === "transfer" ? "transfer" : "first-year"}</dd></div>
        <div><dt>Exams</dt><dd>{plan.externalCredits.length}</dd></div>
        <div><dt>Substitutions</dt><dd>{plan.overrides.length}</dd></div>
      </dl>

      <p className="import-warning">
        This replaces everything currently in this browser. Export your own
        record first if you want to keep it.
      </p>

      <div className="paste-actions">
        <button type="button" onClick={onReplace}>Replace my record</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
