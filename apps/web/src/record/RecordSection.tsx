import type { StudentPlan } from "@gradguide/shared";
import { termCode } from "@gradguide/shared";

/**
 * The record. TASK-022 fills this in with course entry, paste import and
 * external credit; the shell establishes the profile line and the empty state.
 *
 * The student's own record is the first thing on the page, by design: this is a
 * document about them, not a product pitch.
 */
export function RecordSection({ plan }: { plan: StudentPlan }) {
  const empty = plan.completed.length === 0;

  return (
    <section className="section" aria-labelledby="record-heading">
      <div className="section-head">
        <h2 id="record-heading">Your record</h2>
        <p className="profile">
          Entered {termCode(plan.matriculationTerm)}
          {plan.studentType === "transfer" ? ", as a transfer student" : ", as a first-year"}
        </p>
      </div>

      {empty ? (
        <p className="empty">
          No courses yet. Everything below shows what the catalog asks of you and
          how many courses could satisfy each requirement. Add the courses you
          have finished and the list becomes yours.
        </p>
      ) : (
        <ol className="rows record-rows">
          {plan.completed.map((entry, index) => (
            <li key={`${entry.course.department}${entry.course.courseNumber}-${index}`} className="record-row">
              <span className="course-code">
                {entry.course.department} {String(entry.course.courseNumber).padStart(3, "0")}
                {entry.course.suffix} {entry.course.affiliation}
              </span>
              <span className="record-term">{termCode(entry.term)}</span>
              <span className="record-grade">{entry.grade}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
