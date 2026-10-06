import { useId, useState } from "react";
import { compareTerms, termCode } from "@sageplan/shared";
import type { StudentPlan, StudentType, TermId } from "@sageplan/shared";

/**
 * One question, not three.
 *
 * The app no longer asks when you matriculated (ADR-015): it reads it off your
 * earliest course. The inference is shown, because a rule depends on it, and it
 * is correctable, because an inference the student cannot argue with is worse
 * than a question.
 */
export function ProfileFields({
  plan,
  onChange,
}: {
  plan: StudentPlan;
  onChange: (next: { matriculationTerm: TermId | null; studentType: StudentType }) => void;
}) {
  const [correcting, setCorrecting] = useState(false);
  const typeId = useId();
  const seasonId = useId();
  const yearId = useId();

  const inferred = inferMatriculation(plan);
  const isInferred = plan.matriculationTerm === null && inferred !== null;
  const shown = plan.matriculationTerm ?? inferred;
  const thisYear = new Date().getFullYear();

  return (
    <div className="profile-fields">
      <div className="field">
        <label htmlFor={typeId}>You entered as a</label>
        <select
          id={typeId}
          value={plan.studentType}
          onChange={(e) => onChange({ matriculationTerm: plan.matriculationTerm, studentType: e.target.value as StudentType })}
        >
          <option value="firstYear">first-year student</option>
          <option value="transfer">transfer student</option>
        </select>
      </div>

      {!correcting && (
        <p className="profile-inferred">
          {shown === null ? (
            <>Start term not known yet. It is read from your earliest course.</>
          ) : (
            <>
              Starting <span className="course-code">{termCode(shown)}</span>
              {isInferred ? ", from your earliest course" : ""}
            </>
          )}{" "}
          <button type="button" className="link-button" onClick={() => setCorrecting(true)}>
            Correct this
          </button>
        </p>
      )}

      {correcting && (
        <div className="profile-correct">
          <div className="field">
            <label htmlFor={seasonId}>Starting</label>
            <select
              id={seasonId}
              value={shown?.term ?? "FA"}
              onChange={(e) =>
                onChange({
                  matriculationTerm: { year: shown?.year ?? thisYear, term: e.target.value as "FA" | "SP" },
                  studentType: plan.studentType,
                })
              }
            >
              <option value="FA">Fall</option>
              <option value="SP">Spring</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={yearId} className="sr-only">Starting year</label>
            <select
              id={yearId}
              value={shown?.year ?? thisYear}
              onChange={(e) =>
                onChange({
                  matriculationTerm: { year: Number(e.target.value), term: shown?.term ?? "FA" },
                  studentType: plan.studentType,
                })
              }
            >
              {Array.from({ length: 12 }, (_, i) => thisYear + 2 - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button type="button" className="link-button" onClick={() => { onChange({ matriculationTerm: null, studentType: plan.studentType }); setCorrecting(false); }}>
            Go back to reading it from my courses
          </button>
        </div>
      )}
    </div>
  );
}

export function inferMatriculation(plan: StudentPlan): TermId | null {
  let earliest: TermId | null = null;
  for (const c of plan.completed) {
    if (c.term === null) continue;
    if (earliest === null || compareTerms(c.term, earliest) < 0) earliest = c.term;
  }
  return earliest;
}
