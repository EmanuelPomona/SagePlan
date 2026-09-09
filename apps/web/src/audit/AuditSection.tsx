import { useMemo } from "react";
import type { Course, Program, Result } from "@gradguide/shared";
import type { PlanStore } from "../plan/planStore.ts";
import { buildCourseIndex } from "../record/courseIndex.ts";
import { Advisories } from "./Advisories.tsx";
import { AuditResultsContext } from "./auditContext.ts";
import { groupRequirements, type Group } from "./groupRequirements.ts";
import { ProgressCount } from "./ProgressCount.tsx";
import { RequirementDetail } from "./RequirementDetail.tsx";
import { RequirementRow } from "./RequirementRow.tsx";

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

  return (
    <AuditResultsContext.Provider value={results}>
      <section className="section" aria-labelledby="audit-heading">
        <div className="section-head">
          <h2 id="audit-heading">Your requirements</h2>
        </div>

        {programs.map((program) => {
          const groups = groupRequirements(program, results, plan.plan);
          return (
            <div className="program" key={program.id}>
              <ProgramSummary groups={groups} />
              {groups.map((group) => (
                <GroupBlock key={group.title} group={group} plan={plan} index={index} />
              ))}
              <Advisories program={program} />
            </div>
          );
        })}
      </section>
    </AuditResultsContext.Provider>
  );
}

/** Counts that are real, and nothing that is not. */
function ProgramSummary({ groups }: { groups: Group[] }) {
  const rows = groups.flatMap((g) => g.rows).filter((r) => !r.result.waived);
  const open = rows.filter((r) => r.result.status === "unmet" || r.result.status === "partial").length;
  const breadth = groups.find((g) => g.title === "Breadth");

  return (
    <p className="summary" role="status">
      {breadth && (
        <ProgressCount
          have={breadth.rows.filter((r) => r.result.status === "satisfied").length}
          need={breadth.rows.length}
          noun="breadth areas"
        />
      )}
      <span className="summary-count">
        <strong>{open}</strong> {open === 1 ? "requirement" : "requirements"} still open
      </span>
    </p>
  );
}

function GroupBlock({ group, plan, index }: { group: Group; plan: PlanStore; index: ReturnType<typeof buildCourseIndex> }) {
  return (
    <section className="group" aria-labelledby={`group-${slug(group.title)}`}>
      <h3 className="group-title" id={`group-${slug(group.title)}`}>
        {group.title}
      </h3>
      <ol className="rows">
        {group.rows.map(({ requirement, result }, i) => (
          <RequirementRow
            key={requirement.id}
            requirement={requirement}
            result={result}
            externalCredits={plan.plan.externalCredits}
            startsCluster={i === 0}
            detail={(open) =>
              open ? (
                <RequirementDetail
                  requirement={requirement}
                  result={result}
                  index={index}
                  overrides={plan.plan.overrides}
                  attested={plan.plan.attestations[requirement.id] === true}
                  externalCredits={plan.plan.externalCredits}
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
