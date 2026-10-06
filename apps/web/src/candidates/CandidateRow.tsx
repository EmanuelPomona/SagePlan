import { courseKey } from "@sageplan/shared";
import type { Course, CourseId, Section } from "@sageplan/shared";
import { ATTRIBUTE_LABEL } from "../record/attributeLabels.ts";
import { TermRibbon } from "./TermRibbon.tsx";
import type { RibbonCell } from "./selectors.ts";

export function CandidateRow({
  id,
  course,
  sections,
  alsoCloses,
  cells,
}: {
  id: CourseId;
  course: Course | undefined;
  sections: Section[];
  alsoCloses: string[];
  cells: RibbonCell[];
}) {
  const key = courseKey(id);
  const seats = sections.reduce((sum, s) => sum + s.seatsTotal, 0);
  const filled = sections.reduce((sum, s) => sum + s.seatsFilled, 0);
  const instructors = [...new Set(sections.flatMap((s) => s.instructors))];

  return (
    <li className="candidate">
      <div className="candidate-main">
        <span className="course-code">{key}</span>
        <span className="candidate-title">{course?.title ?? ""}</span>
        {course && course.attributes.length > 0 && (
          <span className="chips">
            {course.attributes.map((a) => (
              <span key={a} className="chip">{ATTRIBUTE_LABEL[a]}</span>
            ))}
          </span>
        )}
      </div>

      {alsoCloses.length > 0 && (
        <p className="also-closes">also closes: {alsoCloses.map(humanise).join(", ")}</p>
      )}

      <div className="candidate-meta">
        <TermRibbon cells={cells} />
        {sections.length > 0 && (
          <span className="candidate-sections">
            {instructors.length > 0 && <span>{instructors.join(", ")}</span>}
            <span className="course-code">{filled}/{seats} seats</span>
            <span>{sections[0]!.status}</span>
          </span>
        )}
        <a
          className="candidate-link"
          href={`https://hyperschedule.io/?course=${encodeURIComponent(key)}`}
          rel="noreferrer noopener"
          target="_blank"
        >
          Open in Hyperschedule
        </a>
      </div>
    </li>
  );
}

/** "analyzing-difference" reads as "Analyzing Difference" to a person. */
function humanise(requirementId: string): string {
  return requirementId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
