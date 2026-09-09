import { useId, useMemo, useState } from "react";
import { resolveExternalCredit } from "@gradguide/engine";
import type { ExamKind, ExternalCredit, ExternalCreditRules, IbLevel } from "@gradguide/shared";
import { ATTRIBUTE_LABEL } from "./attributeLabels.ts";

const KIND_LABEL: Record<ExamKind, string> = {
  AP: "Advanced Placement",
  IB: "International Baccalaureate",
  ALEVEL: "A-Level",
  SATII: "SAT Subject Test",
};

const ALEVEL_GRADES = ["A*", "A", "B", "C", "D", "E"];

/**
 * Exams. The point of this section is that it tells the student what the exam
 * actually earned them, in the catalog's terms, at the moment they enter it,
 * including when the answer is "nothing" and why.
 */
export function ExternalCreditEntry({
  rules,
  credits,
  onAdd,
  onRemove,
}: {
  rules: ExternalCreditRules;
  credits: ExternalCredit[];
  onAdd: (credit: ExternalCredit) => void;
  onRemove: (index: number) => void;
}) {
  const [subjectKey, setSubjectKey] = useState("");
  const [score, setScore] = useState("");
  const [grade, setGrade] = useState("");
  const [level, setLevel] = useState<IbLevel>("HL");
  const ids = { subject: useId(), score: useId(), grade: useId(), level: useId() };

  const subject = rules.subjects.find((s) => s.key === subjectKey);
  const byKind = useMemo(() => {
    const groups = new Map<ExamKind, typeof rules.subjects>();
    for (const s of rules.subjects) groups.set(s.kind, [...(groups.get(s.kind) ?? []), s]);
    return groups;
  }, [rules.subjects]);

  // Show the verdict before it is committed, so entry is a conversation.
  const pending = useMemo(() => {
    if (!subject) return null;
    return resolveExternalCredit(
      {
        kind: subject.kind,
        subjectKey: subject.key,
        score: subject.kind === "ALEVEL" ? null : score === "" ? null : Number(score),
        grade: subject.kind === "ALEVEL" ? (grade === "" ? null : grade) : null,
        level: subject.kind === "IB" ? level : null,
      },
      rules,
    );
  }, [subject, score, grade, level, rules]);

  const ready = subject !== undefined && (subject.kind === "ALEVEL" ? grade !== "" : score !== "");

  return (
    <details className="exams">
      <summary>Add an exam (AP, IB, A-Level, SAT Subject)</summary>

      <div className="form-grid">
        <div className="field field-wide">
          <label htmlFor={ids.subject}>Exam</label>
          <select id={ids.subject} value={subjectKey} onChange={(e) => { setSubjectKey(e.target.value); setScore(""); setGrade(""); }}>
            <option value="">Choose an exam</option>
            {[...byKind.entries()].map(([kind, subjects]) => (
              <optgroup key={kind} label={KIND_LABEL[kind]}>
                {subjects.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {subject?.kind === "IB" && (
          <div className="field">
            <label htmlFor={ids.level}>Level</label>
            <select id={ids.level} value={level} onChange={(e) => setLevel(e.target.value as IbLevel)}>
              <option value="HL">Higher Level</option>
              <option value="SL">Standard Level</option>
            </select>
          </div>
        )}

        {subject && subject.kind !== "ALEVEL" && (
          <div className="field">
            <label htmlFor={ids.score}>Score</label>
            <input id={ids.score} value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric"
              placeholder={subject.kind === "AP" ? "1 to 5" : subject.kind === "IB" ? "1 to 7" : "200 to 800"} />
          </div>
        )}

        {subject?.kind === "ALEVEL" && (
          <div className="field">
            <label htmlFor={ids.grade}>Grade</label>
            <select id={ids.grade} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">Choose</option>
              {ALEVEL_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}
      </div>

      {ready && pending && (
        <p className={`exam-verdict${pending.qualifies ? " exam-qualifies" : ""}`} role="status">
          <strong>{pending.label}: </strong>
          {describeCredit(pending)}
        </p>
      )}

      <button type="button" disabled={!ready} onClick={() => { if (pending) { onAdd(pending); setSubjectKey(""); setScore(""); setGrade(""); } }}>
        Add this exam
      </button>

      {credits.length > 0 && (
        <ul className="rows exam-list">
          {credits.map((c, i) => (
            <li key={`${c.subjectKey}-${i}`} className="exam-row">
              <span className="exam-label">{c.label}</span>
              <span className="course-code">{c.score ?? c.grade}{c.level ? ` ${c.level}` : ""}</span>
              <span className="exam-result">{describeCredit(c)}</span>
              <button type="button" className="link-button" onClick={() => onRemove(i)}>
                Remove<span className="sr-only"> {c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

/** What this exam earned, in the catalog's terms, including when it earned nothing. */
export function describeCredit(credit: ExternalCredit): string {
  const parts: string[] = [];
  if (credit.credits > 0) parts.push(`${credit.credits} advanced standing ${credit.credits === 1 ? "credit" : "credits"}`);
  if (credit.grantsAttributes.length > 0) {
    parts.push(`satisfies ${credit.grantsAttributes.map((a) => ATTRIBUTE_LABEL[a]).join(" and ")}`);
  }
  if (parts.length === 0) {
    return credit.notes.length > 0 ? `no credit. ${credit.notes.join(" ")}` : "no credit.";
  }
  return credit.notes.length > 0 ? `${parts.join(", ")}. ${credit.notes.join(" ")}` : `${parts.join(", ")}.`;
}
