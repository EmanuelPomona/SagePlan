import { useId } from "react";
import type { StudentType, TermId } from "@gradguide/shared";

const SEASONS = [
  { value: "FA", label: "Fall" },
  { value: "SP", label: "Spring" },
] as const;

/**
 * Two facts that change the whole audit: when you started, and whether you
 * entered as a first-year or a transfer student. Both are `appliesWhen` inputs,
 * so changing either re-evaluates every requirement.
 */
export function ProfileFields({
  matriculationTerm,
  studentType,
  onChange,
}: {
  matriculationTerm: TermId;
  studentType: StudentType;
  onChange: (next: { matriculationTerm: TermId; studentType: StudentType }) => void;
}) {
  const seasonId = useId();
  const yearId = useId();
  const typeId = useId();
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => thisYear + 2 - i);

  return (
    <div className="profile-fields">
      <div className="field">
        <label htmlFor={seasonId}>Entered</label>
        <select
          id={seasonId}
          value={matriculationTerm.term}
          onChange={(e) => onChange({ matriculationTerm: { ...matriculationTerm, term: e.target.value as "FA" | "SP" }, studentType })}
        >
          {SEASONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={yearId} className="sr-only">Matriculation year</label>
        <select
          id={yearId}
          value={matriculationTerm.year}
          onChange={(e) => onChange({ matriculationTerm: { ...matriculationTerm, year: Number(e.target.value) }, studentType })}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={typeId}>as a</label>
        <select
          id={typeId}
          value={studentType}
          onChange={(e) => onChange({ matriculationTerm, studentType: e.target.value as StudentType })}
        >
          <option value="firstYear">first-year student</option>
          <option value="transfer">transfer student</option>
        </select>
      </div>
    </div>
  );
}
