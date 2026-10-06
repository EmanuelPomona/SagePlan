import { useId, useState } from "react";
import type { CompletedCourse, GeAttribute, Provenance, StudentType, TermId } from "@sageplan/shared";

import { ATTRIBUTE_LABEL } from "./attributeLabels.ts";

const ATTRIBUTES = Object.keys(ATTRIBUTE_LABEL) as GeAttribute[];

/** Kept here now that the spreadsheet parser has been folded into the transcript one. */
const GRADE_VALUES = [
  "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F",
  "CR", "P", "NC", "NP", "IP",
] as const;

/**
 * A course from another institution. It is not in the catalog, so the student
 * supplies what the catalog would otherwise tell us: credits, title, and for a
 * transfer student, the Breadth or overlay award the Registrar granted.
 *
 * The attribute checklist is deliberately gated. Only a transfer student's
 * pre-matriculation transfer work carries an award, and letting anyone tick
 * "Area 3" on any outside course would turn this tool into a way to tell
 * yourself what you want to hear.
 */
export function NonCatalogCourseForm({
  studentType,
  defaultTerm,
  onAdd,
}: {
  studentType: StudentType;
  defaultTerm: TermId | null;
  onAdd: (course: CompletedCourse) => void;
}) {
  const [department, setDepartment] = useState("");
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [credits, setCredits] = useState("1");
  const [season, setSeason] = useState<TermId["term"]>(defaultTerm?.term ?? "FA");
  const [year, setYear] = useState(String(defaultTerm?.year ?? new Date().getFullYear()));
  const [grade, setGrade] = useState("");
  const [provenance, setProvenance] = useState<Provenance>("transfer");
  const [attributes, setAttributes] = useState<GeAttribute[]>([]);
  const ids = { dept: useId(), num: useId(), title: useId(), credits: useId(), season: useId(), year: useId(), grade: useId(), prov: useId() };

  const attributesAllowed = provenance === "transfer" && studentType === "transfer";
  const valid = /^[A-Za-z]{2,5}$/.test(department.trim()) && /^\d{1,3}$/.test(number.trim()) && title.trim() !== "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onAdd({
      course: { department: department.trim().toUpperCase(), courseNumber: Number(number), suffix: "", affiliation: "EXT" },
      term: { year: Number(year), term: season },
      grade,
      gradeMode: grade === "CR" || grade === "NC" ? "creditNoCredit" : grade === "P" || grade === "NP" ? "passNoPass" : "letter",
      provenance,
      title: title.trim(),
      credits: Number(credits),
      ...(attributesAllowed && attributes.length > 0 ? { attributes } : {}),
    });
    setDepartment(""); setNumber(""); setTitle(""); setAttributes([]);
  };

  return (
    <details className="noncatalog">
      <summary>Add a course from another institution</summary>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor={ids.dept}>Subject</label>
            <input id={ids.dept} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="ECON" maxLength={5} />
          </div>
          <div className="field">
            <label htmlFor={ids.num}>Number</label>
            <input id={ids.num} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="101" inputMode="numeric" maxLength={3} />
          </div>
          <div className="field field-wide">
            <label htmlFor={ids.title}>Title</label>
            <input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Principles of Microeconomics" />
          </div>
          <div className="field">
            <label htmlFor={ids.credits}>Credits</label>
            <input id={ids.credits} value={credits} onChange={(e) => setCredits(e.target.value)} inputMode="decimal" />
          </div>
          <div className="field">
            <label htmlFor={ids.season}>Term</label>
            <select id={ids.season} value={season} onChange={(e) => setSeason(e.target.value as TermId["term"])}>
              <option value="FA">Fall</option>
              <option value="SP">Spring</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.year} className="sr-only">Year</label>
            <input id={ids.year} value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" maxLength={4} />
          </div>
          <div className="field">
            <label htmlFor={ids.grade}>Grade</label>
            <select id={ids.grade} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">grade?</option>
              {GRADE_VALUES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.prov}>Taken at</label>
            <select id={ids.prov} value={provenance} onChange={(e) => setProvenance(e.target.value as Provenance)}>
              <option value="transfer">Another institution (transfer)</option>
              <option value="abroad">Study abroad</option>
            </select>
          </div>
        </div>

        <fieldset className="attribute-fieldset" disabled={!attributesAllowed}>
          <legend>
            General education awards
            {!attributesAllowed && (
              <span className="hint">
                {" "}Only a transfer student's transfer coursework can carry a Breadth or overlay award.
              </span>
            )}
          </legend>
          <div className="chips">
            {ATTRIBUTES.map((a) => (
              <label key={a} className="chip chip-check">
                <input
                  type="checkbox"
                  checked={attributes.includes(a)}
                  onChange={(e) => setAttributes((prev) => (e.target.checked ? [...prev, a] : prev.filter((x) => x !== a)))}
                />
                {ATTRIBUTE_LABEL[a]}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={!valid}>Add this course</button>
      </form>
    </details>
  );
}
