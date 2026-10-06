import { courseKey } from "@gradguide/shared";
import type { ExternalCredit, Override, Requirement, Result } from "@gradguide/shared";
import type { CourseIndex } from "../record/courseIndex.ts";
import { AttestationControl } from "./AttestationControl.tsx";
import { OverrideForm } from "./OverrideForm.tsx";
import { ruleToProse } from "./ruleToProse.ts";
import { WhatSatisfiesSlot } from "../candidates/WhatSatisfiesSlot.tsx";

/**
 * What is behind the row: the catalog's full sentence with a link to the page it
 * came from, the rule in plain English, how confident the encoding is, and the
 * two ways a human can overrule the engine.
 */
export function RequirementDetail({
  requirement,
  result,
  index,
  overrides,
  attested,
  externalCredits,
  onAddOverride,
  onRemoveOverride,
  onAttest,
  advisory,
}: {
  requirement: Requirement;
  result: Result;
  index: CourseIndex;
  overrides: Override[];
  attested: boolean;
  externalCredits: ExternalCredit[];
  onAddOverride: (o: Override) => void;
  onRemoveOverride: (i: number) => void;
  onAttest: (value: boolean) => void;
  advisory?: { label: string; text: string; sourceQuote: string } | undefined;
}) {
  return (
    <div className="detail">
      <div className="detail-columns">
        <div>
          <h4>What the catalog says</h4>
          <blockquote className="quote quote-full">{requirement.sourceQuote}</blockquote>
          <p className="detail-source">
            <a href={requirement.sourceRef.url} rel="noreferrer noopener">
              Read this in the catalog
            </a>
          </p>

          <h4>What this tool checked</h4>
          <p className="detail-prose">{ruleToProse(requirement.rule)}</p>
          <p className="detail-explanation">{requirement.explanation}</p>

          {requirement.confidence && requirement.confidence !== "verified" && (
            <p className={`confidence confidence-${requirement.confidence}`}>
              This rule is encoded as <strong>{requirement.confidence}</strong>:{" "}
              {requirement.confidence === "draft"
                ? "read from the catalog, but with an interpretation the Registrar has not confirmed."
                : "read from a secondary source."}
            </p>
          )}

          {advisory && (
            <>
              <h4>Also worth knowing</h4>
              <p className="detail-explanation">{advisory.text}</p>
              <blockquote className="quote">{advisory.sourceQuote}</blockquote>
            </>
          )}

          {result.satisfiedBy.length > 0 && (
            <>
              <h4>Counted toward this</h4>
              <ul className="rows detail-courses">
                {result.satisfiedBy.map((id) => (
                  <li key={courseKey(id)}>
                    <span className="course-code">{courseKey(id)}</span>{" "}
                    {index.byKey.get(courseKey(id))?.title ?? ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <AttestationControl requirement={requirement} checked={attested} onChange={onAttest} />
          <OverrideForm
            requirementId={requirement.id}
            index={index}
            overrides={overrides}
            onAdd={onAddOverride}
            onRemove={onRemoveOverride}
          />
        </div>
      </div>

      <WhatSatisfiesSlot requirement={requirement} result={result} index={index} externalCredits={externalCredits} />
    </div>
  );
}
