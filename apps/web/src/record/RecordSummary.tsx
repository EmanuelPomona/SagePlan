import { courseKey } from "@gradguide/shared";
import type { Course, StudentPlan } from "@gradguide/shared";

/**
 * What the record adds up to, computed the way the engine counts it: the
 * student's own credit value when they gave one, otherwise the catalog's.
 */
export function summarise(plan: StudentPlan, catalog: Course[]): {
  courses: number;
  credits: number;
  exams: number;
  gradesRecorded: number;
} {
  const byKey = new Map(catalog.map((c) => [courseKey(c.id), c]));
  const credits = plan.completed.reduce(
    (sum, c) => sum + (c.credits ?? byKey.get(courseKey(c.course))?.credits.min ?? 1),
    0,
  );
  return {
    courses: plan.completed.length,
    credits: Math.round(credits * 100) / 100,
    exams: plan.externalCredits.length,
    gradesRecorded: plan.completed.filter((c) => c.grade !== null).length,
  };
}

/**
 * The collapsed record: one line, so the requirement map clears the fold.
 *
 * It is a button rather than a summary element because opening it also has to
 * be reachable from the map, and two mechanisms for one disclosure is one too
 * many.
 */
export function RecordSummary({
  plan,
  catalog,
  onExpand,
}: {
  plan: StudentPlan;
  catalog: Course[];
  onExpand: () => void;
}) {
  const { courses, credits, exams, gradesRecorded } = summarise(plan, catalog);

  return (
    <button type="button" className="record-summary" onClick={onExpand} aria-expanded={false}>
      <span className="record-summary-facts">
        <strong>{courses}</strong> {courses === 1 ? "course" : "courses"}
        <span className="record-summary-sep" aria-hidden="true" />
        <strong>{credits}</strong> credits
        {exams > 0 && (
          <>
            <span className="record-summary-sep" aria-hidden="true" />
            <strong>{exams}</strong> {exams === 1 ? "exam" : "exams"}
          </>
        )}
        {gradesRecorded === 0 && courses > 0 && (
          <span className="record-summary-assumed">all assumed passed</span>
        )}
      </span>
      <span className="record-summary-action">Edit your record</span>
    </button>
  );
}
