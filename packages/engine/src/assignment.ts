import type { Program, Requirement } from "@gradguide/shared";
import { termCode } from "@gradguide/shared";
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
  const greedySatisfied = order.filter((r) => meetsDemand(r, greedy.get(r.id) ?? [])).length;
  if (greedySatisfied >= reachable.length) return { assignment: greedy, bounded: false };

  // Phase 2 — bounded backtracking, seeded with the greedy answer.
  const current = empty();
  let nodes = 0;
  let bounded = false;
  let done = false;
  let best = { assignment: greedy, ...scoreOf(order, greedy) };

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
      if (score.satisfied >= reachable.length) done = true;
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

type Score = { satisfied: number; progress: number; used: number };

/**
 * Ranking, in order: close the most requirements; then make the most progress
 * toward the ones left open (so a lone PE course still reports "1 of 2" rather
 * than vanishing); then spend the fewest distinct courses.
 */
function scoreOf(order: Requirement[], assignment: Assignment): Score {
  let satisfied = 0;
  let progress = 0;
  for (const req of order) {
    const selection = assignment.get(req.id) ?? [];
    if (meetsDemand(req, selection)) satisfied += 1;
    progress = round2(progress + progressOf(req, selection));
  }
  return { satisfied, progress, used: distinctUsed(assignment) };
}

function betterScore(a: Score, b: Score): boolean {
  if (a.satisfied !== b.satisfied) return a.satisfied > b.satisfied;
  if (a.progress !== b.progress) return a.progress > b.progress;
  return a.used < b.used;
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

  const already = new Set<string>();
  for (const [id, courses] of current) {
    if (id === req.id) continue;
    for (const c of courses) already.add(c.key);
  }
  const fresh = (sel: ResolvedCourse[]) => sel.filter((c) => !already.has(c.key)).length;
  return fresh(option) < fresh(incumbent);
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

function distinctTermSubset(courses: ResolvedCourse[]): ResolvedCourse[] {
  const seen = new Set<string>();
  return courses.filter((c) => {
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
    if (!held.some((c) => c.key === course.key && c.completed.term === course.completed.term)) continue;
    const other = byId.get(otherId);
    if (!other || !mayShare(req, other)) return false;
  }
  return !violatesConstraint(program, req.id, course, current);
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

function distinctUsed(assignment: Assignment): number {
  const keys = new Set<string>();
  for (const courses of assignment.values()) for (const c of courses) keys.add(c.key);
  return keys.size;
}

function cloneAssignment(assignment: Assignment): Assignment {
  return new Map([...assignment].map(([k, v]) => [k, [...v]]));
}
