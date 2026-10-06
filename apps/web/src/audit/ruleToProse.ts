import { courseKey } from "@sageplan/shared";
import type { CourseFilter, Rule } from "@sageplan/shared";
import { ATTRIBUTE_LABEL } from "../record/attributeLabels.ts";

const NUMBER_WORD = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];

/**
 * The rule in the tool's own voice, beside the catalog's in its own.
 *
 * The verbatim quote is the evidence; this is the plain-English reading of what
 * the engine actually checked. Where the engine checks nothing, this says so
 * rather than paraphrasing the catalog and implying it was verified.
 */
export function ruleToProse(rule: Rule): string {
  switch (rule.kind) {
    case "course": {
      const grade = rule.minGrade ? `, with a grade of ${rule.minGrade} or better` : "";
      return `Pass ${courseKey(rule.course)}${grade}.`;
    }

    case "attribute": {
      const label = ATTRIBUTE_LABEL[rule.attr];
      const unit = rule.unit ?? "courses";
      const head =
        unit === "credits"
          ? `${rule.n} ${rule.n === 1 ? "credit" : "credits"} from courses tagged ${label}`
          : `${NUMBER_WORD[rule.n] ?? rule.n} ${rule.n === 1 ? "course" : "courses"} tagged ${label}`;
      const parts = [head];
      if (rule.distinctTerms) parts.push("taken in different semesters");
      const where = describeFilter(rule.filter);
      if (where) parts.push(where);
      return `${parts.join(", ")}.`;
    }

    case "credits": {
      const parts = [`${rule.n} course credits`];
      const where = describeFilter(rule.filter);
      if (where) parts.push(where);
      if (rule.caps?.advancedStandingCredits !== undefined) {
        parts.push(`counting at most ${rule.caps.advancedStandingCredits} from exams`);
      }
      return `${parts.join(", ")}.`;
    }

    case "gpa":
      return `A grade point average of at least ${rule.min.toFixed(2)} over letter-graded courses.`;

    case "attested":
      return `You confirm this yourself: ${rule.prompt}`;

    default:
      return `Not checked in this version: ${rule.kind}.`;
  }
}

function describeFilter(filter: CourseFilter | undefined): string | null {
  if (!filter) return null;
  const parts: string[] = [];

  if (filter.provenance) {
    const set = new Set(filter.provenance);
    if (set.has("pomona") && set.has("claremont") && !set.has("transfer")) {
      parts.push("taken at the Claremont Colleges");
    } else if (set.size === 1 && set.has("pomona")) {
      parts.push("taken at Pomona");
    } else {
      parts.push(`taken at ${filter.provenance.join(" or ")}`);
    }
  }
  if (filter.sinceMatriculation) parts.push("taken after you matriculated");
  if (filter.partialCredit === "exclude") parts.push("worth a full credit each");
  if (filter.attributes?.length) {
    parts.push(`also tagged ${filter.attributes.map((a) => ATTRIBUTE_LABEL[a]).join(" and ")}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}
