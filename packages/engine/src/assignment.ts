import type { Program, Requirement } from "@gradguide/shared";
import { sameTerm, termCode } from "@gradguide/shared";
import type { EvalContext } from "./context.ts";
import { violatesConstraint, type Assignment } from "./constraints.ts";
import { mayShare } from "./overlap.ts";
import { round2 } from "./ordering.ts";
import type { ResolvedCourse } from "./resolvedCourse.ts";

export type { Assignment };

export type AssignmentOutcome = {
  assignment: Assignment;
  /** True when the search hit its node bound and returned the best found so far. */
  bounded: boolean;
};

/**
 * The search is bounded so a pathological plan can never hang the browser.
 * At P0 scale (~15 requirements, ~32 courses) it is never reached.
 */
const NODE_LIMIT = 10_000;

/** Cap on how many selections are tried per requirement, to bound branching. */
const MAX_OPTIONS_PER_REQUIREMENT = 64;

/** Only these rule kinds compete for the student's courses (docs/API.md 2.3). */
export function isCourseSelecting(req: Requirement): boolean {
  return req.rule.kind === "course" || req.rule.kind === "attribute";
}

/**
 * Constrained-first assignment with bounded backtracking.
 *
 * Requirements with the fewest eligible courses are settled first, so a course
 * that only one requirement can use is never spent on a requirement that had
 * alternatives. No solver dependency.
 */
export function assignCourses(
  requirements: Requirement[],
  eligible: Map<string, ResolvedCourse[]>,
  program: Program,
  _ctx: EvalContext,
): AssignmentOutcome {
  const selecting = requirements.filter(isCourseSelecting);
  const byId = new Map(requirements.map((r) => [r.id, r]));

  // Constrained first; id as the deterministic tie-break.
  const order = [...selecting].sort((a, b) => {
    const na = (eligible.get(a.id) ?? []).length;
    const nb = (eligible.get(b.id) ?? []).length;
    if (na !== nb) return na - nb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const empty = (): Assignment => new Map(requirements.map((r) => [r.id, [] as ResolvedCourse[]]));

  // Phase 1 — greedy, constrained first. Each requirement takes its locally
  // best selection: close the requirement, make the most progress, and add the
  // fewest NEW courses, so a course that already counts elsewhere is reused
  // before a fresh one is spent (docs/API.md 2.3 step 4).
  const greedy = empty();
  for (const req of order) {
    const options = selectionsFor(req, eligible.get(req.id) ?? [], greedy, byId, program);
    let best = options[0] ?? [];
    for (const option of options.slice(1)) {
      if (localBetter(req, option, best, greedy)) best = option;
    }
    greedy.set(req.id, best);
  }

  // A requirement whose entire eligible set still cannot close it is not
  // "unsatisfied because of a bad assignment" — no backtracking can help it.
  const reachable = order.filter((r) => meetsDemand(r, eligible.get(r.id) ?? []));

  // Upper bound on partial progress: what each requirement could reach if it
  // had its whole eligible set to itself. Not always jointly achievable, but a
  // valid ceiling. Closing on `satisfied` alone was not enough: greedy could
  // close every closable requirement and still leave a PARTIAL row reporting
  // more owed than the student actually owes, which is the same defect class as
  // the PE bug (a wrong number on a row the student is reading).
  const progressCeiling = round2(
    order.reduce((sum, r) => sum + progressOf(r, eligible.get(r.id) ?? []), 0),
  );

  const greedyScore = scoreOf(order, greedy);
  // Sharing has no computable lower bound short of searching, but ZERO sharing
  // is provably minimal, so that is the only safe early exit.
  const optimal = (score: Score): boolean =>
    score.satisfied >= reachable.length && score.progress >= progressCeiling && score.shared === 0;

  if (optimal(greedyScore)) return { assignment: greedy, bounded: false };

  // Phase 2 — bounded backtracking, seeded with the greedy answer.
  const current = empty();
  let nodes = 0;
  let bounded = false;
  let done = false;
  let best = { assignment: greedy, ...greedyScore };

  const search = (index: number): void => {
    if (done) return;
    if (nodes++ > NODE_LIMIT) {
      bounded = true;
      done = true;
      return;
    }

    if (index === order.length) {
      const score = scoreOf(order, current);
      if (betterScore(score, best)) best = { assignment: cloneAssignment(current), ...score };
      if (optimal(score)) done = true;
      return;
    }

    const req = order[index]!;
    for (const option of selectionsFor(req, eligible.get(req.id) ?? [], current, byId, program)) {
      current.set(req.id, option);
      search(index + 1);
      current.set(req.id, []);
      if (done) return;
    }
  };

  search(0);
  return { assignment: best.assignment, bounded };
}

type Score = { satisfied: number; progress: number; shared: number };

/**
 * Ranking, in order (ADR-013):
 *   1. close the most requirements;
 *   2. make the most progress toward the ones left open, so a lone PE course
 *      still reports "1 of 2" rather than vanishing;
 *   3. MINIMIZE SHARING, counting every (requirement, course) pair whose course
 *      is also counted elsewhere.
 *
 * Step 3 replaces the superseded "leave the most courses unassigned", which
 * contradicted its own parenthetical: leaving courses unassigned maximises
 * sharing, so one course was credited to two requirements while an equally
 * valid course sat unused. No verdict was wrong, but the attribution a student
 * reads was, and the requirement map now prints it under every node.
 *
 * Sharing still happens whenever nothing else can close a requirement, which is
 * the normal case for the overlays.
 */
function scoreOf(order: Requirement[], assignment: Assignment): Score {
  let satisfied = 0;
  let progress = 0;
  for (const req of order) {
    const selection = assignment.get(req.id) ?? [];
    if (meetsDemand(req, selection)) satisfied += 1;
    progress = round2(progress + progressOf(req, selection));
  }
  return { satisfied, progress, shared: sharedPairs(assignment) };
}

/** How many (requirement, course) pairs sit on a course counted somewhere else. */
function sharedPairs(assignment: Assignment): number {
  const holders = new Map<string, number>();
  for (const courses of assignment.values()) {
    for (const c of courses) holders.set(c.key, (holders.get(c.key) ?? 0) + 1);
  }
  let shared = 0;
  for (const count of holders.values()) if (count > 1) shared += count;
  return shared;
}

function betterScore(a: Score, b: Score): boolean {
  if (a.satisfied !== b.satisfied) return a.satisfied > b.satisfied;
  if (a.progress !== b.progress) return a.progress > b.progress;
  return a.shared < b.shared;
}

/** How much of this requirement the selection closes, never more than it asks for. */
function progressOf(req: Requirement, selection: ResolvedCourse[]): number {
  if (req.rule.kind === "course") return selection.length > 0 ? 1 : 0;
  if (req.rule.kind !== "attribute") return 0;

  const rule = req.rule;
  const counted = rule.distinctTerms ? distinctTermSubset(selection) : selection;
  const have = (rule.unit ?? "courses") === "credits"
    ? round2(counted.reduce((sum, c) => sum + c.credits, 0))
    : counted.length;
  return Math.min(have, rule.n);
}

/** Local comparison used by the greedy pass. */
function localBetter(
  req: Requirement,
  option: ResolvedCourse[],
  incumbent: ResolvedCourse[],
  current: Assignment,
): boolean {
  const satOption = meetsDemand(req, option) ? 1 : 0;
  const satIncumbent = meetsDemand(req, incumbent) ? 1 : 0;
  if (satOption !== satIncumbent) return satOption > satIncumbent;

  const progressDelta = progressOf(req, option) - progressOf(req, incumbent);
  if (progressDelta !== 0) return progressDelta > 0;

  // Prefer a course nothing else is already counting. The superseded rule did
  // the opposite, and that is exactly how one course came to be credited twice.
  const already = new Set<string>();
  for (const [id, courses] of current) {
    if (id === req.id) continue;
    for (const c of courses) already.add(c.key);
  }
  const shared = (sel: ResolvedCourse[]) => sel.filter((c) => already.has(c.key)).length;
  const delta = shared(option) - shared(incumbent);
  if (delta !== 0) return delta < 0;

  // Deterministic: the canonically first selection wins, so the same plan always
  // produces the same attribution.
  return false;
}

/** Does this selection fully close the requirement? */
export function meetsDemand(req: Requirement, selection: ResolvedCourse[]): boolean {
  if (req.rule.kind === "course") return selection.length >= 1;
  if (req.rule.kind !== "attribute") return false;

  const rule = req.rule;
  const counted = rule.distinctTerms ? distinctTermSubset(selection) : selection;
  const have = (rule.unit ?? "courses") === "credits"
    ? round2(counted.reduce((sum, c) => sum + c.credits, 0))
    : counted.length;
  return have >= rule.n;
}

/**
 * Used only to decide whether a selection could close a distinctTerms rule, so
 * an unrecorded term is read optimistically here: the rule's own settle step,
 * running under both passes, is what decides the reported status.
 */
function distinctTermSubset(courses: ResolvedCourse[]): ResolvedCourse[] {
  const seen = new Set<string>();
  return courses.filter((c) => {
    if (c.completed.term === null) return true;
    const t = termCode(c.completed.term);
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

/**
 * Candidate selections for one requirement, best first: the selections that
 * close it, then the largest partial selection, then nothing.
 */
function selectionsFor(
  req: Requirement,
  eligible: ResolvedCourse[],
  current: Assignment,
  byId: Map<string, Requirement>,
  program: Program,
): ResolvedCourse[][] {
  const assignable = eligible.filter((c) => canAssign(req, c, current, byId, program));
  if (assignable.length === 0) return [[]];

  const options: ResolvedCourse[][] = [];

  if (req.rule.kind === "course") {
    for (const c of assignable.slice(0, MAX_OPTIONS_PER_REQUIREMENT)) options.push([c]);
  } else if (req.rule.kind === "attribute") {
    const rule = req.rule;
    if ((rule.unit ?? "courses") === "credits") {
      // Accumulate in canonical order until the credit target is met; offer
      // later starting points as alternatives.
      for (let start = 0; start < assignable.length && options.length < MAX_OPTIONS_PER_REQUIREMENT; start++) {
        const picked: ResolvedCourse[] = [];
        let sum = 0;
        for (let i = start; i < assignable.length && sum < rule.n; i++) {
          picked.push(assignable[i]!);
          sum = round2(sum + assignable[i]!.credits);
        }
        if (picked.length > 0 && !options.some((o) => sameSelection(o, picked))) options.push(picked);
      }
    } else {
      const k = Math.max(1, Math.ceil(rule.n));
      for (const combo of combinations(assignable, Math.min(k, assignable.length), MAX_OPTIONS_PER_REQUIREMENT)) {
        if (rule.distinctTerms && distinctTermSubset(combo).length < combo.length) continue;
        options.push(combo);
      }
    }
  }

  // A partial selection still reports `partial` rather than `unmet`, and the
  // empty selection lets another requirement take a contested course.
  if (!options.some((o) => o.length === 1) && assignable.length > 0) options.push([assignable[0]!]);
  options.push([]);
  return options;
}

/** Overlap policies on both sides, plus the program's own constraints. */
function canAssign(
  req: Requirement,
  course: ResolvedCourse,
  current: Assignment,
  byId: Map<string, Requirement>,
  program: Program,
): boolean {
  for (const [otherId, held] of current) {
    if (otherId === req.id) continue;
    // Compare terms BY VALUE. TermId is an object, and two rows for the same
    // course in the same term are distinct objects with equal values, so
    // reference equality let a duplicated row slip past the overlap check and
    // close two exclusive requirements at once.
    //
    // A term may now be unrecorded. Two rows for the same course with no terms
    // cannot be told apart, so they are treated as the same sitting: that keeps
    // the duplicate from closing two requirements, which is the whole point.
    if (!held.some((c) => c.key === course.key && sameSitting(c, course))) continue;
    const other = byId.get(otherId);
    if (!other || !mayShare(req, other)) return false;
  }
  return !violatesConstraint(program, req.id, course, current);
}

/** Null-safe term comparison: unknown and unknown are indistinguishable. */
function sameSitting(a: ResolvedCourse, b: ResolvedCourse): boolean {
  const ta = a.completed.term;
  const tb = b.completed.term;
  if (ta === null || tb === null) return ta === tb;
  return sameTerm(ta, tb);
}

function combinations(pool: ResolvedCourse[], k: number, cap: number): ResolvedCourse[][] {
  const out: ResolvedCourse[][] = [];
  const build = (start: number, acc: ResolvedCourse[]): void => {
    if (out.length >= cap) return;
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < pool.length; i++) {
      acc.push(pool[i]!);
      build(i + 1, acc);
      acc.pop();
      if (out.length >= cap) return;
    }
  };
  build(0, []);
  return out;
}

function sameSelection(a: ResolvedCourse[], b: ResolvedCourse[]): boolean {
  return a.length === b.length && a.every((c, i) => c.key === b[i]!.key);
}

function cloneAssignment(assignment: Assignment): Assignment {
  return new Map([...assignment].map(([k, v]) => [k, [...v]]));
}
