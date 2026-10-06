import { describe, expect, test } from "vitest";
import { courseKey } from "@sageplan/shared";
import type { Requirement } from "@sageplan/shared";
import { assignCourses } from "../src/assignment.ts";
import { buildContext } from "../src/context.ts";
import { mayShare } from "../src/overlap.ts";
import { eligibleCourses } from "../src/rules/attribute.ts";
import type { ResolvedCourse } from "../src/resolvedCourse.ts";
import { attributeRule, catalogCourse, completed, planWith, program, requirement, term } from "./helpers.ts";

function eligibleMap(reqs: Requirement[], ctx: ReturnType<typeof buildContext>) {
  const m = new Map<string, ResolvedCourse[]>();
  for (const r of reqs) {
    m.set(r.id, r.rule.kind === "attribute" ? eligibleCourses(r.rule, ctx) : []);
  }
  return m;
}

/** The wrong way: program order, first eligible course, consume it. Implemented HERE so the fixture proves it fails. */
function naiveGreedy(reqs: Requirement[], eligible: Map<string, ResolvedCourse[]>) {
  const used = new Set<string>();
  const out = new Map<string, ResolvedCourse[]>();
  for (const r of reqs) {
    const pick = (eligible.get(r.id) ?? []).find((c) => !used.has(c.key));
    if (pick) {
      used.add(pick.key);
      out.set(r.id, [pick]);
    } else {
      out.set(r.id, []);
    }
  }
  return out;
}

describe("mayShare", () => {
  const a = requirement("a", attributeRule("AREA_1"));
  test("allowAll on both sides shares", () => {
    expect(mayShare(a, requirement("b", attributeRule("AREA_2")))).toBe(true);
  });

  test("exclusive on either side blocks sharing", () => {
    const excl = requirement("b", attributeRule("AREA_2"), { kind: "exclusive" });
    expect(mayShare(a, excl)).toBe(false);
    expect(mayShare(excl, a)).toBe(false);
  });

  test("denyOnly blocks exactly the listed requirement", () => {
    const wi = requirement("writing-intensive", attributeRule("WRITING_INTENSIVE"), {
      kind: "denyOnly", requirementIds: ["speaking-intensive"],
    });
    const si = requirement("speaking-intensive", attributeRule("SPEAKING_INTENSIVE"), {
      kind: "denyOnly", requirementIds: ["writing-intensive"],
    });
    expect(mayShare(wi, si)).toBe(false);
    expect(mayShare(wi, requirement("area-1", attributeRule("AREA_1")))).toBe(true);
  });

  test("allowOnly permits only the listed requirement", () => {
    const only = requirement("b", attributeRule("AREA_2"), { kind: "allowOnly", requirementIds: ["a"] });
    expect(mayShare(only, a)).toBe(true);
    expect(mayShare(only, requirement("c", attributeRule("AREA_3")))).toBe(false);
  });
});

describe("F-06 — the rare course must not be spent on the common slot", () => {
  const reqs = [
    requirement("area-3", attributeRule("AREA_3")),
    requirement("analyzing-difference", attributeRule("ANALYZING_DIFFERENCE")),
  ];
  const catalog = [
    catalogCourse("AMST 110 PO", ["AREA_3", "ANALYZING_DIFFERENCE"]),
    catalogCourse("HIST 101 PO", ["AREA_3"]),
  ];
  const ctx = buildContext(planWith({ completed: [completed("AMST 110 PO"), completed("HIST 101 PO")] }), catalog);
  const eligible = eligibleMap(reqs, ctx);

  test("a naive greedy assignment leaves Analyzing Difference unmet", () => {
    const greedy = naiveGreedy(reqs, eligible);

    expect(greedy.get("area-3")?.map((c) => c.key)).toEqual(["AMST 110 PO"]);
    expect(greedy.get("analyzing-difference")).toEqual([]);
  });

  test("assignCourses satisfies both", () => {
    const { assignment } = assignCourses(reqs, eligible, program("p", reqs), ctx);

    expect(assignment.get("area-3")).toHaveLength(1);
    expect(assignment.get("analyzing-difference")).toHaveLength(1);
    expect(assignment.get("analyzing-difference")?.[0]?.key).toBe("AMST 110 PO");
  });
});

describe("F-10 — one course tagged both WI and SI can only close one of them", () => {
  const reqs = [
    requirement("writing-intensive", attributeRule("WRITING_INTENSIVE"), { kind: "denyOnly", requirementIds: ["speaking-intensive"] }),
    requirement("speaking-intensive", attributeRule("SPEAKING_INTENSIVE"), { kind: "denyOnly", requirementIds: ["writing-intensive"] }),
  ];
  const catalog = [catalogCourse("PHIL 032 PO", ["WRITING_INTENSIVE", "SPEAKING_INTENSIVE"])];
  const ctx = buildContext(planWith({ completed: [completed("PHIL 032 PO")] }), catalog);

  test("exactly one is satisfied, never both by the same course", () => {
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx), program("p", reqs), ctx);
    const wi = assignment.get("writing-intensive") ?? [];
    const si = assignment.get("speaking-intensive") ?? [];

    expect(wi.length + si.length).toBe(1);
  });

  test("a second, single-tagged course closes the other one", () => {
    const catalog2 = [...catalog, catalogCourse("RHET 010 PO", ["SPEAKING_INTENSIVE"])];
    const ctx2 = buildContext(planWith({ completed: [completed("PHIL 032 PO"), completed("RHET 010 PO")] }), catalog2);
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx2), program("p", reqs), ctx2);

    expect(assignment.get("writing-intensive")?.map((c) => c.key)).toEqual(["PHIL 032 PO"]);
    expect(assignment.get("speaking-intensive")?.map((c) => c.key)).toEqual(["RHET 010 PO"]);
  });
});

describe("exclusive policy", () => {
  test("an exclusive requirement keeps its course to itself", () => {
    const reqs = [
      requirement("critical-inquiry", attributeRule("AREA_1"), { kind: "exclusive" }),
      requirement("area-1", attributeRule("AREA_1")),
    ];
    const catalog = [catalogCourse("ID 001 PO", ["AREA_1"])];
    const ctx = buildContext(planWith({ completed: [completed("ID 001 PO")] }), catalog);
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx), program("p", reqs), ctx);

    const ci = assignment.get("critical-inquiry") ?? [];
    const a1 = assignment.get("area-1") ?? [];
    expect(ci.length + a1.length).toBe(1);
  });
});

describe("F-09 — distinctDepartments across the Breadth areas", () => {
  const reqs = [
    requirement("area-1", attributeRule("AREA_1")),
    requirement("area-6", attributeRule("AREA_6")),
  ];
  const constraints = [
    {
      kind: "distinctDepartments" as const,
      requirementIds: ["area-1", "area-6"],
      explanation: "No two Breadth areas may be satisfied by courses from the same department.",
      sourceQuote: "no two of the six areas may be satisfied by courses from the same department",
      sourceRef: { slug: "ge", url: "https://catalog.pomona.edu/ge" },
    },
  ];

  test("two DANC courses cannot close both areas", () => {
    const catalog = [catalogCourse("DANC 051 PO", ["AREA_1"]), catalogCourse("DANC 120 PO", ["AREA_6"])];
    const ctx = buildContext(planWith({ completed: [completed("DANC 051 PO"), completed("DANC 120 PO")] }), catalog);
    const prog = program("p", reqs, constraints);
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx), prog, ctx);

    const a1 = assignment.get("area-1") ?? [];
    const a6 = assignment.get("area-6") ?? [];
    expect(a1.length + a6.length).toBe(1);
  });

  test("courses from different departments close both", () => {
    const catalog = [catalogCourse("DANC 051 PO", ["AREA_1"]), catalogCourse("THEA 001 PO", ["AREA_6"])];
    const ctx = buildContext(planWith({ completed: [completed("DANC 051 PO"), completed("THEA 001 PO")] }), catalog);
    const prog = program("p", reqs, constraints);
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx), prog, ctx);

    expect(assignment.get("area-1")).toHaveLength(1);
    expect(assignment.get("area-6")).toHaveLength(1);
  });
});

describe("assignment properties", () => {
  test("a requirement needing two courses takes two", () => {
    const reqs = [requirement("pe", attributeRule("PHYSICAL_EDUCATION", 2, { distinctTerms: true }))];
    const catalog = [catalogCourse("PE 001 PO", ["PHYSICAL_EDUCATION"], 0.25), catalogCourse("PE 002 PO", ["PHYSICAL_EDUCATION"], 0.25)];
    const ctx = buildContext(
      planWith({ completed: [completed("PE 001 PO", { term: term("FA2025") }), completed("PE 002 PO", { term: term("SP2026") })] }),
      catalog,
    );
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx), program("p", reqs), ctx);

    expect(assignment.get("pe")).toHaveLength(2);
  });

  test("assignment is deterministic under a shuffled record", () => {
    const reqs = [
      requirement("area-3", attributeRule("AREA_3")),
      requirement("analyzing-difference", attributeRule("ANALYZING_DIFFERENCE")),
    ];
    const catalog = [
      catalogCourse("AMST 110 PO", ["AREA_3", "ANALYZING_DIFFERENCE"]),
      catalogCourse("HIST 101 PO", ["AREA_3"]),
      catalogCourse("PHIL 032 PO", ["AREA_3"]),
    ];
    const forward = [completed("AMST 110 PO"), completed("HIST 101 PO"), completed("PHIL 032 PO")];
    const reversed = [...forward].reverse();

    const run = (order: typeof forward) => {
      const ctx = buildContext(planWith({ completed: order }), catalog);
      const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx), program("p", reqs), ctx);
      return [...assignment.entries()].map(([id, cs]) => [id, cs.map((c) => courseKey(c.completed.course))]);
    };

    expect(run(forward)).toEqual(run(reversed));
  });

  test("an unsatisfiable requirement is left empty rather than throwing", () => {
    const reqs = [requirement("area-4", attributeRule("AREA_4"))];
    const ctx = buildContext(planWith({ completed: [] }), []);
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, ctx), program("p", reqs), ctx);

    expect(assignment.get("area-4")).toEqual([]);
  });
});

describe("ADR-013 — minimize sharing, not maximize unassigned courses", () => {
  // AMST 110 carries Area 3 AND Analyzing Difference; HIST 101 carries Area 3
  // only. Nothing else covers either. One course could legally close both
  // (allowAll), and the superseded tie-break preferred exactly that.
  const reqs = [
    requirement("area-3", attributeRule("AREA_3")),
    requirement("analyzing-difference", attributeRule("ANALYZING_DIFFERENCE")),
  ];
  const catalog = [
    catalogCourse("AMST 110 PO", ["AREA_3", "ANALYZING_DIFFERENCE"]),
    catalogCourse("HIST 101 PO", ["AREA_3"]),
  ];
  const ctx = buildContext(planWith({ completed: [completed("AMST 110 PO"), completed("HIST 101 PO")] }), catalog);
  const eligible = eligibleMap(reqs, ctx);

  /**
   * The SUPERSEDED rule, implemented here so the fixture actually discriminates:
   * among options that satisfy the requirement, prefer the one adding the fewest
   * NEW courses, which is what "leave the most courses unassigned" means in
   * practice. A comment asserting this would prove nothing.
   */
  function supersededGreedy() {
    const assignment = new Map<string, ResolvedCourse[]>();
    const order = [...reqs].sort((a, b) => (eligible.get(a.id) ?? []).length - (eligible.get(b.id) ?? []).length);
    for (const req of order) {
      const used = new Set([...assignment.values()].flat().map((c) => c.key));
      const options = (eligible.get(req.id) ?? []).map((c) => [c]);
      // fewest new courses wins, ties by canonical order
      const best = options.sort((a, b) => {
        const fresh = (s: ResolvedCourse[]) => s.filter((c) => !used.has(c.key)).length;
        return fresh(a) !== fresh(b) ? fresh(a) - fresh(b) : a[0]!.key < b[0]!.key ? -1 : 1;
      })[0];
      assignment.set(req.id, best ?? []);
    }
    return assignment;
  }

  test("the superseded tie-break credits ONE course to both and leaves the other unused", () => {
    const old = supersededGreedy();

    expect(old.get("area-3")?.map((c) => c.key)).toEqual(["AMST 110 PO"]);
    expect(old.get("analyzing-difference")?.map((c) => c.key)).toEqual(["AMST 110 PO"]);
    const used = new Set([...old.values()].flat().map((c) => c.key));
    expect(used.has("HIST 101 PO")).toBe(false);
  });

  test("assignCourses credits the common course to Area 3 and the rare one to Analyzing Difference", () => {
    const { assignment } = assignCourses(reqs, eligible, program("p", reqs), ctx);

    expect(assignment.get("area-3")?.map((c) => c.key)).toEqual(["HIST 101 PO"]);
    expect(assignment.get("analyzing-difference")?.map((c) => c.key)).toEqual(["AMST 110 PO"]);
  });

  test("HIST 101 PO is actually used, not left on the shelf", () => {
    const { assignment } = assignCourses(reqs, eligible, program("p", reqs), ctx);
    const used = new Set([...assignment.values()].flat().map((c) => c.key));

    expect(used.has("HIST 101 PO")).toBe(true);
    expect(used.has("AMST 110 PO")).toBe(true);
  });

  test("sharing still happens when nothing else can close a requirement", () => {
    // Only one course, carrying both attributes: sharing is the only option.
    const onlyShared = buildContext(planWith({ completed: [completed("AMST 110 PO")] }), catalog);
    const { assignment } = assignCourses(reqs, eligibleMap(reqs, onlyShared), program("p", reqs), onlyShared);

    expect(assignment.get("area-3")?.map((c) => c.key)).toEqual(["AMST 110 PO"]);
    expect(assignment.get("analyzing-difference")?.map((c) => c.key)).toEqual(["AMST 110 PO"]);
  });
});
