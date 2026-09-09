import { useId, useState } from "react";
import { courseKey } from "@gradguide/shared";
import type { Course, CourseId, Override } from "@gradguide/shared";
import { CourseSearch } from "../record/CourseSearch.tsx";
import type { CourseIndex } from "../record/courseIndex.ts";

/**
 * A chair-granted substitution. No data source knows about these, so they are
 * entered by hand and are marked as human judgment wherever they appear.
 */
export function OverrideForm({
  requirementId,
  index,
  overrides,
  onAdd,
  onRemove,
}: {
  requirementId: string;
  index: CourseIndex;
  overrides: Override[];
  onAdd: (override: Override) => void;
  onRemove: (index: number) => void;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const ids = { reason: useId(), approver: useId() };

  const mine = overrides.map((o, i) => ({ override: o, index: i })).filter((o) => o.override.requirementId === requirementId);
  const valid = course !== null && reason.trim() !== "" && approvedBy.trim() !== "";

  return (
    <div className="override-form">
      <h4>Substitution approved by a chair or dean</h4>

      {mine.length > 0 && (
        <ul className="rows">
          {mine.map(({ override, index: i }) => (
            <li key={i} className="override-row">
              <span className="course-code">{courseKey(override.course)}</span>
              <span>approved by {override.approvedBy}</span>
              <span className="override-reason">{override.reason}</span>
              <button type="button" className="link-button" onClick={() => onRemove(i)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <CourseSearch index={index} onSelect={setCourse} compact label="Course that was substituted" placeholder="Course that was substituted" />
      {course && <p className="override-chosen"><span className="course-code">{courseKey(course.id)}</span> {course.title}</p>}

      <div className="form-grid">
        <div className="field field-wide">
          <label htmlFor={ids.reason}>Reason</label>
          <input id={ids.reason} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ran as a speaking-intensive section" />
        </div>
        <div className="field">
          <label htmlFor={ids.approver}>Approved by</label>
          <input id={ids.approver} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Chair of History" />
        </div>
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          if (!course) return;
          onAdd({ requirementId, course: course.id as CourseId, reason: reason.trim(), approvedBy: approvedBy.trim() });
          setCourse(null); setReason(""); setApprovedBy("");
        }}
      >
        Record this substitution
      </button>
    </div>
  );
}
