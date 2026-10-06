import { useMemo, useState } from "react";
import type { Course, ExternalCreditRules } from "@gradguide/shared";
import type { PlanStore } from "../plan/planStore.ts";
import { TranscriptPaste } from "../transcript/TranscriptPaste.tsx";
import { buildCourseIndex } from "./courseIndex.ts";
import { provenanceFor } from "./inferProvenance.ts";
import { CourseSearch } from "./CourseSearch.tsx";
import { CourseTable } from "./CourseTable.tsx";
import { ExternalCreditEntry } from "./ExternalCreditEntry.tsx";
import { NonCatalogCourseForm } from "./NonCatalogCourseForm.tsx";
import { ProfileFields } from "./ProfileFields.tsx";
import { RecordSummary } from "./RecordSummary.tsx";

/**
 * The record, collapsed to one line once it holds anything.
 *
 * This is what actually puts the requirement map above the fold (ADR-011): the
 * v0 record was the tallest thing on the page and the student had already told
 * it everything it needed.
 */
export function RecordSection({ plan, catalog, rules }: { plan: PlanStore; catalog: Course[]; rules: ExternalCreditRules }) {
  const index = useMemo(() => buildCourseIndex(catalog), [catalog]);
  const empty = plan.plan.completed.length === 0 && plan.plan.externalCredits.length === 0;
  const [open, setOpen] = useState(false);

  // Empty opens expanded, because there is nothing to collapse and the student
  // has to start somewhere.
  const expanded = open || empty;

  if (!expanded) {
    return (
      <section className="section section-record" aria-labelledby="record-heading">
        <h2 id="record-heading" className="sr-only">Your record</h2>
        <RecordSummary plan={plan.plan} catalog={catalog} onExpand={() => setOpen(true)} />
      </section>
    );
  }

  return (
    <section className="section section-record" aria-labelledby="record-heading">
      <div className="section-head">
        <h2 id="record-heading">Your record</h2>
        {!empty && (
          <button type="button" className="link-button" onClick={() => setOpen(false)}>
            Done editing
          </button>
        )}
      </div>

      <ProfileFields plan={plan.plan} onChange={plan.setProfile} />

      {empty ? (
        <TranscriptPaste index={index} existing={plan.plan.completed} onAdd={(rows) => rows.forEach(plan.addCompleted)} />
      ) : (
        <details className="paste">
          <summary>Paste more from a transcript or a spreadsheet</summary>
          <TranscriptPaste index={index} existing={plan.plan.completed} onAdd={(rows) => rows.forEach(plan.addCompleted)} />
        </details>
      )}

      <CourseSearch
        index={index}
        label="Or add one course at a time"
        onSelect={(course) =>
          plan.addCompleted({
            course: course.id,
            term: null,
            grade: null,
            gradeMode: null,
            provenance: provenanceFor(course.id),
          })
        }
      />

      {plan.plan.completed.length > 0 && (
        <p className="assumed-note">
          Courses with no grade are <strong>assumed passed</strong>. If you did not
          pass one, open its <em>edit</em> and say so.
        </p>
      )}

      <CourseTable
        completed={plan.plan.completed}
        index={index}
        onUpdate={plan.updateCompleted}
        onRemove={plan.removeCompleted}
      />

      <div className="record-tools">
        <NonCatalogCourseForm
          studentType={plan.plan.studentType}
          defaultTerm={plan.plan.matriculationTerm}
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
