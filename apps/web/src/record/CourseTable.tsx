import { courseKey, termCode } from "@gradguide/shared";
import type { CompletedCourse, Provenance } from "@gradguide/shared";
import { GRADE_VALUES } from "./parsePaste.ts";
import type { CourseIndex } from "./courseIndex.ts";

const PROVENANCES: { value: Provenance; label: string }[] = [
  { value: "pomona", label: "Pomona" },
  { value: "claremont", label: "Claremont" },
  { value: "abroad", label: "Abroad" },
  { value: "transfer", label: "Transfer" },
];

/**
 * The student's record as a document: one ruled line per course, editable in
 * place. Grade and provenance are selects because both change the verdict, and
 * a free-text field that silently fails to parse would be worse than useless.
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
    <table className="course-table">
      <caption className="sr-only">Courses you have completed</caption>
      <thead>
        <tr>
          <th scope="col">Course</th>
          <th scope="col">Title</th>
          <th scope="col">Term</th>
          <th scope="col">Grade</th>
          <th scope="col">Taken at</th>
          <th scope="col"><span className="sr-only">Remove</span></th>
        </tr>
      </thead>
      <tbody>
        {completed.map((entry, i) => {
          const key = courseKey(entry.course);
          const known = index.byKey.get(key);
          const title = entry.title ?? known?.title ?? "";
          return (
            <tr key={`${key}-${termCode(entry.term)}-${i}`}>
              <td className="course-code">{key}</td>
              <td className="cell-title">
                {title}
                {!known && (
                  <span className="mark-not-in-catalog" title="This course is not in the catalog, so its credits and attributes come from what you entered.">
                    not in catalog
                  </span>
                )}
              </td>
              <td className="course-code cell-term">{termCode(entry.term)}</td>
              <td>
                <label className="sr-only" htmlFor={`grade-${i}`}>Grade for {key}</label>
                <select id={`grade-${i}`} value={entry.grade} onChange={(e) => onUpdate(i, gradePatch(e.target.value))}>
                  <option value="">grade?</option>
                  {GRADE_VALUES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </td>
              <td>
                <label className="sr-only" htmlFor={`prov-${i}`}>Where {key} was taken</label>
                <select id={`prov-${i}`} value={entry.provenance} onChange={(e) => onUpdate(i, { provenance: e.target.value as Provenance })}>
                  {PROVENANCES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <button type="button" className="link-button" onClick={() => onRemove(i)}>
                  Remove<span className="sr-only"> {key}</span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function gradePatch(grade: string): Partial<CompletedCourse> {
  const gradeMode = grade === "CR" || grade === "NC" ? "creditNoCredit" : grade === "P" || grade === "NP" ? "passNoPass" : "letter";
  return { grade, gradeMode };
}
