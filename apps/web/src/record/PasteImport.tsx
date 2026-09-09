import { useId, useState } from "react";
import { courseKey, termCode } from "@gradguide/shared";
import type { CompletedCourse, TermId } from "@gradguide/shared";
import { parsePaste, type PasteResult } from "./parsePaste.ts";
import type { CourseIndex } from "./courseIndex.ts";

/**
 * Paste from the spreadsheet the student is already keeping. Nothing is added
 * until they have seen exactly what was understood and what was not.
 */
export function PasteImport({
  index,
  defaultTerm,
  existing,
  onAdd,
}: {
  index: CourseIndex;
  defaultTerm: TermId;
  existing: CompletedCourse[];
  onAdd: (rows: CompletedCourse[]) => void;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PasteResult | null>(null);
  const areaId = useId();

  const parse = () => setPreview(parsePaste(text, index, { term: defaultTerm, existing }));

  const add = () => {
    if (!preview) return;
    onAdd(preview.rows);
    setText("");
    setPreview(null);
  };

  return (
    <details className="paste">
      <summary>Paste from a spreadsheet</summary>

      <label htmlFor={areaId}>
        One course per line: a course code, optionally a term and a grade, separated by tabs or commas.
      </label>
      <textarea
        id={areaId}
        rows={5}
        value={text}
        placeholder={"CSCI 051 PO\tFA2025\tA-\nHIST 101 PO\tSP2026\tB+"}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
      />

      <div className="paste-actions">
        <button type="button" onClick={parse} disabled={text.trim() === ""}>
          Check what this will add
        </button>
      </div>

      {preview && (
        <div className="paste-preview">
          {preview.rows.length > 0 && (
            <>
              <h4>{preview.rows.length} {preview.rows.length === 1 ? "course" : "courses"} understood</h4>
              <ul className="rows">
                {preview.rows.map((row, i) => (
                  <li key={i} className="paste-row">
                    <span className="course-code">{courseKey(row.course)}</span>
                    <span className="course-code">{termCode(row.term)}</span>
                    <span className="course-code">{row.grade === "" ? "no grade" : row.grade}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {preview.rejected.length > 0 && (
            <div className="paste-rejected" role="alert">
              <h4>{preview.rejected.length} {preview.rejected.length === 1 ? "line" : "lines"} not added</h4>
              <ul className="rows">
                {preview.rejected.map((r) => (
                  <li key={r.line} className="paste-row">
                    <span className="course-code">line {r.line}</span>
                    <span className="rejected-text">{r.text}</span>
                    <span className="rejected-reason">{r.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="paste-actions">
            <button type="button" onClick={add} disabled={preview.rows.length === 0}>
              Add {preview.rows.length} {preview.rows.length === 1 ? "course" : "courses"}
            </button>
            <button type="button" className="link-button" onClick={() => setPreview(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
