/**
 * Writes the F-01..F-12 StudentPlan fixtures.
 *
 * Run: npx tsx test/fixtures/build-plans.ts   (from packages/engine)
 * The plans are committed; this script exists so the exam-credit fixtures are
 * resolved by the real rules table rather than hand-copied.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { ExternalCreditRulesSchema } from "@gradguide/shared";
import type { CompletedCourse, ExternalCreditInput, StudentPlan, TermId } from "@gradguide/shared";
import { resolveExternalCredit } from "../../src/externalCredit.ts";

const RULES = ExternalCreditRulesSchema.parse(JSON.parse(readFileSync("../../data/external-credit-rules.json", "utf8")));

const FA25: TermId = { year: 2025, term: "FA" };
const SP26: TermId = { year: 2026, term: "SP" };
const FA26: TermId = { year: 2026, term: "FA" };
const FA24: TermId = { year: 2024, term: "FA" };
const SP25: TermId = { year: 2025, term: "SP" };

function c(key: string, term: TermId, grade = "A-", over: Partial<CompletedCourse> = {}): CompletedCourse {
  const [dept, num, aff] = key.split(" ") as [string, string, string];
  const suffix = num.replace(/[0-9]/g, "");
  return {
    course: { department: dept, courseNumber: Number(num.replace(/[^0-9]/g, "")), suffix, affiliation: aff },
    term,
    grade,
    gradeMode: grade === "CR" ? "creditNoCredit" : "letter",
    provenance: aff === "PO" ? "pomona" : aff === "EXT" ? "transfer" : "claremont",
    ...over,
  };
}

const base = (over: Partial<StudentPlan> = {}): StudentPlan => ({
  schemaVersion: 1,
  catalogYear: "2026-2027",
  matriculationTerm: FA25,
  studentType: "firstYear",
  completed: [],
  planned: [],
  externalCredits: [],
  attestations: {},
  overrides: [],
  declarations: [],
  ...over,
});

const exam = (i: ExternalCreditInput) => resolveExternalCredit(i, RULES);
const ap = (subjectKey: string, score: number): ExternalCreditInput => ({ kind: "AP", subjectKey, score, grade: null, level: null });
const ib = (subjectKey: string, score: number, level: "HL" | "SL"): ExternalCreditInput => ({ kind: "IB", subjectKey, score, grade: null, level });
const satii = (subjectKey: string, score: number): ExternalCreditInput => ({ kind: "SATII", subjectKey, score, grade: null, level: null });
const alevel = (subjectKey: string, grade: string): ExternalCreditInput => ({ kind: "ALEVEL", subjectKey, score: null, grade, level: null });

const plans: Record<string, StudentPlan> = {
  // On-track second-year: CI, five areas, WI, AD, one PE. Area 6, SI, Language
  // and the second PE are still owed.
  "F-01": base({
    completed: [
      c("ID 001 PO", FA25, "A-"), c("ENGL 067 PO", FA25, "A"), c("PSYC 052 SC", FA25, "B+"),
      c("CSCI 051 PO", FA25, "A"), c("PE 001 PO", FA25, "CR"),
      c("HIST 101 PO", SP26, "A-"), c("BIOL 041 PO", SP26, "B"), c("ANTH 025 PO", SP26, "A"),
      c("MATH 030 PO", SP26, "B+"), c("GEOL 112 PO", SP26, "B-"),
      c("CSCI 062 PO", FA26, "A"), c("ECON 051 PO", FA26, "B+"), c("RLST 040 PO", FA26, "A-"),
      c("CHEM 051 PO", FA26, "B"), c("SPAN 001 PO", FA26, "A-"),
      c("ARTH 051 PO", FA26, "A"), c("ENGL 010 PO", FA26, "A-"), c("SOC 001 PO", FA26, "B+"),
      c("PHYS 041 PO", FA26, "B"), c("MATH 060 PO", FA26, "A-"),
    ],
  }),

  // Transfer student: pre-matriculation transfer work tagged Area 2 and Area 3.
  "F-02": base({
    matriculationTerm: FA26,
    studentType: "transfer",
    completed: [
      c("ECON 101 EXT", FA24, "A", { title: "Principles of Microeconomics", credits: 1, attributes: ["AREA_2"], provenance: "transfer" }),
      c("HIST 210 EXT", SP25, "B+", { title: "United States since 1877", credits: 1, attributes: ["AREA_3"], provenance: "transfer" }),
      c("PE 001 PO", FA26, "CR"),
      c("CSCI 051 PO", FA26, "A"), c("ENGL 067 PO", FA26, "A-"), c("BIOL 041 PO", FA26, "B+"),
    ],
  }),

  // AP and IB credit, including a duplicate calculus pair and an IB SL that
  // earns nothing.
  "F-03": base({
    completed: [c("CSCI 051 PO", FA25, "A"), c("ENGL 067 PO", FA25, "A-")],
    externalCredits: [
      exam(ap("ap-calculus-ab", 5)), exam(ap("ap-calculus-bc", 5)), exam(ap("ap-biology", 4)),
      exam(ib("ib-chemistry", 7, "HL")), exam(ib("ib-history", 7, "SL")), exam(ap("ap-spanish-language", 5)),
    ],
  }),

  // Threshold boundaries. No language coursework: the qualifying exams alone
  // must close the Language requirement.
  "F-03b": base({
    completed: [c("CSCI 051 PO", FA25, "A")],
    externalCredits: [
      exam(ap("ap-french-language", 3)), exam(ap("ap-german-language", 4)),
      exam(ib("ib-spanish-b", 7, "SL")), exam(ib("ib-french-b", 6, "HL")), exam(ib("ib-spanish-a", 7, "SL")),
      exam(satii("satii-chinese", 800)), exam(satii("satii-french", 650)),
      exam(alevel("alevel-chinese", "A")), exam(alevel("alevel-german", "B")),
    ],
  }),

  // Chair-granted substitution on speaking-intensive with a course carrying no SI tag.
  "F-04": base({
    completed: [c("HIST 101 PO", FA25, "A"), c("CSCI 051 PO", FA25, "A-")],
    overrides: [{
      requirementId: "speaking-intensive",
      course: { department: "HIST", courseNumber: 101, suffix: "", affiliation: "PO" },
      reason: "Section was run as a speaking-intensive seminar in Fall 2025.",
      approvedBy: "Chair of History",
    }],
  }),

  // One course short: Area 4 unmet, 31 credits.
  "F-05": base({
    completed: [
      c("ID 001 PO", FA25, "A-"), c("ENGL 067 PO", FA25, "A"), c("PSYC 052 SC", FA25, "B+"),
      c("HIST 101 PO", FA25, "A-"), c("CSCI 051 PO", FA25, "A"), c("THEA 001 PO", FA25, "A-"),
      c("RHET 010 PO", SP26, "A"), c("ANTH 025 PO", SP26, "A-"), c("SPAN 033 PO", SP26, "B+"),
      c("PE 001 PO", FA25, "CR"), c("PE 002 PO", SP26, "CR"),
      ...Array.from({ length: 21 }, (_, i) => c(`FILL ${String(i + 1).padStart(3, "0")} PO`, FA26, "B", {
        title: `Elective ${i + 1}`, credits: 1,
      })),
    ],
  }),

  // The only AD course also carries Area 3; a common course carries Area 3 only.
  "F-06": base({ completed: [c("AMST 110 PO", FA25, "A"), c("HIST 101 PO", FA25, "A-")] }),

  // Deferred rule kinds, evaluated alongside GE.
  "F-07": base({ completed: [c("CSCI 051 PO", FA25, "A")] }),

  // Fake major using only P0 rule kinds.
  "F-08": base({
    completed: [
      c("CSCI 051 PO", FA25, "A"), c("CSCI 062 PO", SP26, "A-"), c("MATH 030 PO", FA25, "B+"),
      c("MATH 060 PO", SP26, "A"), c("CSCI 195 PO", FA26, "A"),
    ],
  }),

  // Two Dance courses cannot close both Area 1 and Area 6.
  "F-09": base({ completed: [c("DANC 051 PO", FA25, "A"), c("DANC 120 PO", SP26, "A-")] }),

  // One course tagged both WI and SI.
  "F-10": base({ completed: [c("PHIL 032 PO", FA25, "A")] }),

  // Two PE courses in the same term.
  "F-11": base({ completed: [c("PE 001 PO", FA25, "CR"), c("PE 002 PO", FA25, "CR")] }),

  // Empty plan.
  "F-12": base({}),
};

for (const [id, plan] of Object.entries(plans)) {
  writeFileSync(`test/fixtures/plans/${id}.json`, `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(`wrote ${Object.keys(plans).length} plan fixtures`);
