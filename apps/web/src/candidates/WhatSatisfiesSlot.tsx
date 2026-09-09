import { useMemo, useState } from "react";
import { courseKey, parseTermCode, termCode } from "@gradguide/shared";
import type { ExternalCredit, Requirement, Result, TermCode } from "@gradguide/shared";
import { useData } from "../data/DataProvider.tsx";
import { useHistory, useSections } from "../data/useLazyData.ts";
import { useAuditResults } from "../audit/auditContext.ts";
import type { CourseIndex } from "../record/courseIndex.ts";
import { CandidateRow } from "./CandidateRow.tsx";
import { dualPurpose, offeredIn, ribbon } from "./selectors.ts";

/**
 * "What satisfies this?" answered the way a student asks it in registration
 * week: not the whole catalog, but the courses that close this requirement AND
 * are actually offered next term, marked where one course would close something
 * else they still owe.
 */
export function WhatSatisfiesSlot({
  requirement,
  result,
  index,
  externalCredits: _externalCredits,
}: {
  requirement: Requirement;
  result: Result;
  index: CourseIndex;
  externalCredits: ExternalCredit[];
}) {
  const data = useData();
  const allResults = useAuditResults();
  const upcoming = data.status === "ready" ? data.manifest.upcomingTerms : [];
  const [term, setTerm] = useState<TermCode | null>(upcoming[0] ?? null);
  const [showAll, setShowAll] = useState(false);

  const sections = useSections(term);
  const history = useHistory(true);

  const knownTerms = history.status === "ready" ? history.value.knownTerms : [];
  const historyEntries = history.status === "ready" ? history.value.history : [];

  const offered = useMemo(
    () => (sections.status === "ready" ? offeredIn(result.candidates, sections.value.sections) : new Map()),
    [sections, result.candidates],
  );

  if (result.candidates.length === 0) return null;

  const sectionsUnavailable = sections.status === "error";
  const filtering = !showAll && sections.status === "ready";
  const shown = filtering ? result.candidates.filter((c) => offered.has(courseKey(c))) : result.candidates;
  const termLabel = term ? readableTerm(term) : "the next term";

  return (
    <section className="what-satisfies" aria-labelledby={`ws-${requirement.id}`}>
      <div className="ws-head">
        <h4 id={`ws-${requirement.id}`}>What satisfies this?</h4>
        {upcoming.length > 0 && (
          <label className="field">
            <span>Offered in</span>
            <select value={term ?? ""} onChange={(e) => setTerm(e.target.value as TermCode)}>
              {upcoming.map((t) => (
                <option key={t} value={t}>{readableTerm(t)}</option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          <span>Show all catalog candidates</span>
        </label>
      </div>

      {sections.status === "loading" && (
        <p className="ws-note" role="status">Loading the courses offered in {termLabel}.</p>
      )}

      {sectionsUnavailable && (
        <p className="ws-note" role="status">
          Section data for {termLabel} is not available; showing all catalog candidates.
        </p>
      )}

      {sections.status === "ready" && (
        <p className="ws-count">
          {filtering ? shown.length : result.candidates.length} of {result.candidates.length}{" "}
          {result.candidates.length === 1 ? "course" : "courses"} that satisfy this
          {filtering ? ` are offered in ${termLabel}` : " in the catalog"}.
        </p>
      )}

      {filtering && shown.length === 0 ? (
        <p className="ws-empty">
          None of the {result.candidates.length} courses that satisfy this are offered in {termLabel}.
          Turn on "Show all catalog candidates" to see them anyway.
        </p>
      ) : (
        <ul className="rows candidates">
          {shown.slice(0, 40).map((id) => (
            <CandidateRow
              key={courseKey(id)}
              id={id}
              course={index.byKey.get(courseKey(id))}
              sections={offered.get(courseKey(id)) ?? []}
              alsoCloses={dualPurpose(id, allResults, requirement.id)}
              cells={ribbon(id, historyEntries, knownTerms, 8)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** "SP2027" -> "SP 2027", which is how it is said out loud. */
function readableTerm(code: TermCode): string {
  const parsed = parseTermCode(code);
  return parsed ? `${parsed.term} ${parsed.year}` : code;
}

export { termCode };
