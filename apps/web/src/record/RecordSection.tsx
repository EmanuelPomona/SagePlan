import { useMemo } from "react";
import { compareTerms } from "@gradguide/shared";
import type { Course, ExternalCreditRules } from "@gradguide/shared";
import type { PlanStore } from "../plan/planStore.ts";
import { buildCourseIndex } from "./courseIndex.ts";
import { provenanceFor } from "./parsePaste.ts";
import { CourseSearch } from "./CourseSearch.tsx";
import { CourseTable } from "./CourseTable.tsx";
import { ExternalCreditEntry } from "./ExternalCreditEntry.tsx";
import { NonCatalogCourseForm } from "./NonCatalogCourseForm.tsx";
import { PasteImport } from "./PasteImport.tsx";
import { ProfileFields } from "./ProfileFields.tsx";

/**
 * The student's own record, and the first thing on the page. Everything below
 * it is derived from what is here.
 */
export function RecordSection({ plan, catalog, rules }: { plan: PlanStore; catalog: Course[]; rules: ExternalCreditRules }) {
  const index = useMemo(() => buildCourseIndex(catalog), [catalog]);

  // New courses land in the term the student was last working in, which is
  // almost always the one they are still typing.
  const defaultTerm = useMemo(() => {
    const terms = plan.plan.completed.map((c) => c.term);
    if (terms.length === 0) return plan.plan.matriculationTerm;
    return terms.reduce((latest, t) => (compareTerms(t, latest) > 0 ? t : latest), terms[0]!);
  }, [plan.plan.completed, plan.plan.matriculationTerm]);

  const empty = plan.plan.completed.length === 0 && plan.plan.externalCredits.length === 0;

  return (
    <section className="section" aria-labelledby="record-heading">
      <div className="section-head">
        <h2 id="record-heading">Your record</h2>
        <ProfileFields
          matriculationTerm={plan.plan.matriculationTerm}
          studentType={plan.plan.studentType}
          onChange={plan.setProfile}
        />
      </div>

      <CourseSearch
        index={index}
        onSelect={(course) =>
          plan.addCompleted({
            course: course.id,
            term: defaultTerm,
            grade: "",
            gradeMode: "letter",
            provenance: provenanceFor(course),
          })
        }
      />

      {empty && (
        <p className="empty">
          No courses yet. Everything below shows what the catalog asks of you and
          how many courses could satisfy each requirement. Add the courses you
          have finished and the list becomes yours.
        </p>
      )}

      <CourseTable
        completed={plan.plan.completed}
        index={index}
        onUpdate={plan.updateCompleted}
        onRemove={plan.removeCompleted}
      />

      <div className="record-tools">
        <PasteImport
          index={index}
          defaultTerm={defaultTerm}
          existing={plan.plan.completed}
          onAdd={(rows) => rows.forEach(plan.addCompleted)}
        />
        <NonCatalogCourseForm
          studentType={plan.plan.studentType}
          defaultTerm={defaultTerm}
          onAdd={plan.addCompleted}
        />
        <ExternalCreditEntry
          rules={rules}
          credits={plan.plan.externalCredits}
          onAdd={plan.addExternalCredit}
          onRemove={plan.removeExternalCredit}
        />
      </div>
    </section>
  );
}
