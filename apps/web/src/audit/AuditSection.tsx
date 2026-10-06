import { useCallback, useMemo, useRef, useState } from "react";
import type { Course, Program, Result } from "@sageplan/shared";
import type { PlanStore } from "../plan/planStore.ts";
import { RequirementMap } from "../map/RequirementMap.tsx";
import { buildCourseIndex } from "../record/courseIndex.ts";
import { AuditResultsContext } from "./auditContext.ts";
import { groupRequirements, type Group } from "./groupRequirements.ts";
import { RequirementDetail } from "./RequirementDetail.tsx";
import { RequirementRow } from "./RequirementRow.tsx";

/**
 * The map answers "where do I stand"; the rows are the evidence.
 *
 * Expansion is held here rather than per row, because a node in the map has to
 * be able to open a row further down the page. One open row at a time keeps the
 * page short enough that the map stays reachable.
 */
export function AuditSection({
  programs,
  results,
  plan,
  catalog,
}: {
  programs: Program[];
  results: Result[];
  plan: PlanStore;
  catalog: Course[];
}) {
  const index = useMemo(() => buildCourseIndex(catalog), [catalog]);
  const [openId, setOpenId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const openFromMap = useCallback((requirementId: string) => {
    setOpenId(requirementId);
    // The evidence is below the fold by design, so take the student to it.
    window.requestAnimationFrame(() => {
      rowRefs.current.get(requirementId)?.scrollIntoView({ block: "center", behavior: "auto" });
    });
  }, []);

  return (
    <AuditResultsContext.Provider value={results}>
      {programs.map((program) => (
        <RequirementMap
          key={`map-${program.id}`}
          program={program}
          results={results}
          plan={plan.plan}
          externalCredits={plan.plan.externalCredits}
          onOpen={openFromMap}
        />
      ))}

      <section className="section" aria-labelledby="audit-heading">
        <div className="section-head">
          <h2 id="audit-heading">Every requirement, with the catalog's own words</h2>
        </div>

        {programs.map((program) => (
          <div className="program" key={program.id}>
            {groupRequirements(program, results, plan.plan).map((group) => (
              <GroupBlock
                key={group.title}
                group={group}
                program={program}
                plan={plan}
                index={index}
                openId={openId}
                onToggle={(id) => setOpenId((current) => (current === id ? null : id))}
                registerRow={(id, el) => {
                  if (el) rowRefs.current.set(id, el);
                  else rowRefs.current.delete(id);
                }}
              />
            ))}
          </div>
        ))}
      </section>
    </AuditResultsContext.Provider>
  );
}

function GroupBlock({
  group,
  program,
  plan,
  index,
  openId,
  onToggle,
  registerRow,
}: {
  group: Group;
  program: Program;
  plan: PlanStore;
  index: ReturnType<typeof buildCourseIndex>;
  openId: string | null;
  onToggle: (id: string) => void;
  registerRow: (id: string, el: HTMLLIElement | null) => void;
}) {
  return (
    <section className="group" aria-labelledby={`group-${slug(group.title)}`}>
      <h3 className="group-title" id={`group-${slug(group.title)}`}>{group.title}</h3>
      <ol className="rows">
        {group.rows.map(({ requirement, result }, i) => (
          <RequirementRow
            key={requirement.id}
            ref={(el) => registerRow(requirement.id, el)}
            requirement={requirement}
            result={result}
            externalCredits={plan.plan.externalCredits}
            startsCluster={i === 0}
            open={openId === requirement.id}
            onToggle={() => onToggle(requirement.id)}
            detail={(open) =>
              open ? (
                <RequirementDetail
                  requirement={requirement}
                  result={result}
                  index={index}
                  overrides={plan.plan.overrides}
                  attested={plan.plan.attestations[requirement.id] === true}
                  externalCredits={plan.plan.externalCredits}
                  advisory={program.advisories?.find((a) => a.id === requirement.id)}
                  onAddOverride={plan.addOverride}
                  onRemoveOverride={plan.removeOverride}
                  onAttest={(value) => plan.setAttestation(requirement.id, value)}
                />
              ) : null
            }
          />
        ))}
      </ol>
    </section>
  );
}

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
