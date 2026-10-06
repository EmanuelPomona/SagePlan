import { useMemo } from "react";
import { courseKey, parseTermCode } from "@sageplan/shared";
import type { ExternalCredit, Program, Result, StudentPlan, TermCode } from "@sageplan/shared";
import { useData } from "../data/DataProvider.tsx";
import { useSections } from "../data/useLazyData.ts";
import { AdministrativeStrip } from "./AdministrativeStrip.tsx";
import { mapFamilies } from "./families.ts";
import { RequirementNode } from "./RequirementNode.tsx";

/**
 * The requirement map: the answer, above the fold.
 *
 * v0 put seventeen ruled rows between the student and "where do I stand", which
 * measured 1774px. This is a diagram, not a dashboard: twelve rings in three
 * families, no percentage, no donut, no stat tiles. Clicking a ring opens its
 * evidence row below, so the answer and the reason stay one page.
 */
export function RequirementMap({
  program,
  results,
  plan,
  externalCredits,
  onOpen,
}: {
  program: Program;
  results: Result[];
  plan: StudentPlan;
  externalCredits: ExternalCredit[];
  onOpen: (requirementId: string) => void;
}) {
  const data = useData();
  const upcoming: TermCode[] = data.status === "ready" ? data.manifest.upcomingTerms : [];
  const term = upcoming[0] ?? null;
  const sections = useSections(term);

  // "2 in SP27" is the only actionable number on an unmet node.
  const offeredByRequirement = useMemo(() => {
    const out = new Map<string, number>();
    if (sections.status !== "ready") return out;
    const offered = new Set(sections.value.sections.map((s) => courseKey(s.course)));
    for (const r of results) {
      if (r.candidates.length === 0) continue;
      out.set(r.requirementId, r.candidates.filter((c) => offered.has(courseKey(c))).length);
    }
    return out;
  }, [sections, results]);

  const families = useMemo(
    () => mapFamilies(program.requirements, results, plan),
    [program.requirements, results, plan],
  );
  const termLabel = term ? readableTerm(term) : null;

  return (
    <section className="map" aria-labelledby="map-heading">
      <h2 id="map-heading" className="sr-only">Where you stand</h2>

      <div className="map-families">
        {families.map((family) => (
          <div key={family.name} className={`map-family family-${family.name.toLowerCase()}`}>
            <h3 className="family-name">{family.name}</h3>
            <div className="family-nodes">
              {family.nodes.map(({ requirement, result }) => (
                <RequirementNode
                  key={requirement.id}
                  requirement={requirement}
                  result={result}
                  externalCredits={externalCredits}
                  offeredNextTerm={offeredByRequirement.get(requirement.id) ?? null}
                  termLabel={termLabel}
                  onOpen={() => onOpen(requirement.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <AdministrativeStrip requirements={program.requirements} results={results} onOpen={onOpen} />
    </section>
  );
}

function readableTerm(code: TermCode): string {
  const parsed = parseTermCode(code);
  return parsed ? `${parsed.term}${String(parsed.year).slice(2)}` : code;
}
