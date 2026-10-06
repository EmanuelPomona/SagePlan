import { useId, useState } from "react";
import { courseKey, termCode } from "@sageplan/shared";
import type { CompletedCourse, Provenance } from "@sageplan/shared";
import type { CourseIndex } from "./courseIndex.ts";

const GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "CR", "P", "NC", "NP", "IP"];
const PROVENANCES: { value: Provenance; label: string }[] = [
  { value: "pomona", label: "Pomona" },
  { value: "claremont", label: "Another Claremont college" },
  { value: "abroad", label: "Study abroad" },
  { value: "transfer", label: "Another institution" },
];

/**
 * The record as a list of courses, which after ADR-015 is all it needs to be.
 *
 * Term, grade and where it was taken are real fields the engine uses, but a
 * student should not have to touch any of them, so they live behind a per-row
 * disclosure instead of occupying three columns nobody fills in.
 */
export function CourseTable({
  completed,
  index,
  onUpdate,
  onRemove,
}: {
  completed: CompletedCourse[];
  index: CourseIndex;
  onUpdate: (i: number, patch: Partial<CompletedCourse>) => void;
  onRemove: (i: number) => void;
}) {
  if (completed.length === 0) return null;

  return (
    <ol className="rows course-list">
      {completed.map((entry, i) => (
        <CourseRow
          key={`${courseKey(entry.course)}-${i}`}
          entry={entry}
          index={index}
          onUpdate={(patch) => onUpdate(i, patch)}
          onRemove={() => onRemove(i)}
        />
      ))}
    </ol>
  );
}

function CourseRow({
  entry,
  index,
  onUpdate,
  onRemove,
}: {
  entry: CompletedCourse;
  index: CourseIndex;
  onUpdate: (patch: Partial<CompletedCourse>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const key = courseKey(entry.course);
  const known = index.byKey.get(key);
  const title = entry.title ?? known?.title ?? "";
  const failed = entry.grade !== null && ["F", "NC", "NP"].includes(entry.grade);

  return (
    <li className="course-row">
      <div className="course-row-main">
        <span className="course-code">{key}</span>
        <span className="course-row-title">
          {title}
          {!known && <span className="mark-not-in-catalog">not in catalog</span>}
          {failed && <span className="mark-failed">not passed</span>}
          {entry.term && <span className="course-row-term">{termCode(entry.term)}</span>}
          {entry.grade && <span className="course-row-grade">{entry.grade}</span>}
        </span>
        <button type="button" className="link-button" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((o) => !o)}>
          edit<span className="sr-only"> {key}</span>
        </button>
        <button type="button" className="link-button" onClick={onRemove}>
          remove<span className="sr-only"> {key}</span>
        </button>
      </div>

      <div id={detailId} className="course-row-detail" hidden={!open}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${detailId}-term`}>Term</label>
            <select
              id={`${detailId}-term`}
              value={entry.term ? termCode(entry.term) : ""}
              onChange={(e) => onUpdate({ term: e.target.value === "" ? null : parseTerm(e.target.value) })}
            >
              <option value="">not recorded</option>
              {termChoices().map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor={`${detailId}-grade`}>Grade</label>
            <select
              id={`${detailId}-grade`}
              value={entry.grade ?? ""}
              onChange={(e) => {
                const grade = e.target.value === "" ? null : e.target.value;
                onUpdate({ grade, gradeMode: gradeModeFor(grade) });
              }}
            >
              <option value="">not recorded (assumed passed)</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor={`${detailId}-prov`}>Taken at</label>
            <select
              id={`${detailId}-prov`}
              value={entry.provenance}
              onChange={(e) => onUpdate({ provenance: e.target.value as Provenance })}
            >
              {PROVENANCES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* The one thing a student MUST tell us, said plainly and once. */}
        <label className="did-not-pass">
          <input
            type="checkbox"
            checked={failed}
            onChange={(e) => onUpdate(e.target.checked ? { grade: "F", gradeMode: "letter" } : { grade: null, gradeMode: null })}
          />
          I did not pass this course
        </label>
      </div>
    </li>
  );
}

function termChoices(): string[] {
  const thisYear = new Date().getFullYear();
  const out: string[] = [];
  for (let y = thisYear + 1; y >= thisYear - 8; y--) {
    out.push(`SP${y}`, `FA${y}`);
  }
  return out;
}

function parseTerm(code: string): { year: number; term: "FA" | "SP" } | null {
  const m = /^(FA|SP)(\d{4})$/.exec(code);
  return m?.[1] && m[2] ? { term: m[1] as "FA" | "SP", year: Number(m[2]) } : null;
}

function gradeModeFor(grade: string | null) {
  if (grade === null) return null;
  if (grade === "CR" || grade === "NC") return "creditNoCredit" as const;
  if (grade === "P" || grade === "NP") return "passNoPass" as const;
  return "letter" as const;
}
