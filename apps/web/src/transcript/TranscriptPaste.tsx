import { useId, useState } from "react";
import { courseKey, termCode } from "@sageplan/shared";
import type { CompletedCourse } from "@sageplan/shared";
import type { CourseIndex } from "../record/courseIndex.ts";
import { parseTranscriptText, type TranscriptResult } from "./parseTranscriptText.ts";

/**
 * Paste your transcript.
 *
 * The parser is deliberately tolerant, and the preview is the only thing
 * standing between that tolerance and silently wrong data, so it shows what was
 * understood AND what was skipped, and nothing is added until the student says
 * so. This is also the strongest demonstration of the privacy promise: the most
 * sensitive document a student has is read in their browser and never uploaded.
 */
export function TranscriptPaste({
  index,
  existing,
  onAdd,
}: {
  index: CourseIndex;
  existing: CompletedCourse[];
  onAdd: (rows: CompletedCourse[]) => void;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<TranscriptResult | null>(null);
  const areaId = useId();

  const add = () => {
    if (!preview) return;
    onAdd(preview.rows);
    setText("");
    setPreview(null);
  };

  return (
    <div className="transcript-paste">
      <label htmlFor={areaId}>
        Select your academic history in the portal, copy it, and paste it here.
        Course codes are enough; terms and grades are used if they are there.
      </label>
      <textarea
        id={areaId}
        rows={6}
        value={text}
        placeholder={"Fall 2025\nCSCI 051 PO   Introduction to Computer Science   1.00   A\nMATH 030 PO   Calculus I                        1.00   B+"}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
      />
      <p className="privacy-note">
        This is read in your browser. It is never uploaded, and this page makes no
        network requests except for its own files.
      </p>

      <div className="paste-actions">
        <button type="button" onClick={() => setPreview(parseTranscriptText(text, index, { existing }))} disabled={text.trim() === ""}>
          Check what this will add
        </button>
      </div>

      {preview && (
        <div className="paste-preview">
          <h4>
            {preview.rows.length} {preview.rows.length === 1 ? "course" : "courses"} understood
            {preview.rows.length > 0 && (
              <span className="preview-detected">
                {preview.detected.terms && preview.detected.grades
                  ? ", with terms and grades"
                  : preview.detected.terms
                    ? ", with terms"
                    : preview.detected.grades
                      ? ", with grades"
                      : ", course codes only"}
              </span>
            )}
          </h4>

          {preview.rows.length > 0 && (
            <ul className="rows">
              {preview.rows.map((row, i) => (
                <li key={i} className="paste-row">
                  <span className="course-code">{courseKey(row.course)}</span>
                  <span className="course-code">{row.term ? termCode(row.term) : "no term"}</span>
                  <span className="course-code">{row.grade ?? "assumed passed"}</span>
                </li>
              ))}
            </ul>
          )}

          {preview.rejected.length > 0 && (
            <div className="paste-rejected" role="alert">
              <h4>{preview.rejected.length} {preview.rejected.length === 1 ? "line" : "lines"} not added</h4>
              <ul className="rows">
                {preview.rejected.map((r) => (
                  <li key={r.line} className="paste-row">
                    <span className="course-code">line {r.line}</span>
                    <span className="rejected-text">{r.text.slice(0, 60)}</span>
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
            <button type="button" className="link-button" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
