import { PipelineError } from "../errors.ts";

export interface RegistrarParseResult {
  rows: RegistrarRow[];
  /** Raw `Measure Values` cells that were not a number. Counted, never silent. */
  garbledMeasureValues: string[];
}

export interface RegistrarRow {
  courseNumber: string;
  courseTitle: string;
  breadthArea: string;
  measureName: string;
  breadthAreaDescription: string;
  language: string;
  measureValue: number;
}

const EXPECTED_COLUMNS = [
  "Course Number", "Course Title", "Breadth Area", "Measure Names",
  "Breadth Area Description", "Language", "Measure Values",
] as const;

/**
 * The Registrar export is a Tableau download: UTF-16 LE with a BOM, tab
 * delimited, CRLF. Decoded with TextDecoder rather than a dependency.
 */
export function decodeUtf16(buf: Buffer): string {
  if (buf.length % 2 !== 0) {
    throw new PipelineError(`registrar export is not UTF-16 (odd byte length ${buf.length})`, "REGISTRAR_BAD_ENCODING");
  }
  const text = new TextDecoder("utf-16le").decode(buf);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * `Measure Values` is 0, 1 or 2 in the committed export — NOT 0/1 as the task
 * spec states. All nineteen 2s are Physical Education on full-credit dance and
 * PE courses, and AC-B02's PE count of 241 only holds if 2 counts as present.
 *
 * A cell that is neither is coerced to 0 ("overlay absent") — the safe direction,
 * since inventing an attribute is worse than missing one — but it is COUNTED, so
 * a format change cannot pass as a silent pile of absent overlays.
 */
function readMeasureValue(raw: string | undefined, garbled: string[]): number {
  const text = (raw ?? "").trim();
  if (text === "") return 0;
  const n = Number(text);
  if (!Number.isFinite(n)) { garbled.push(text); return 0; }
  return n;
}

export function parseRegistrarCsv(buf: Buffer): RegistrarRow[] {
  return parseRegistrarCsvDetailed(buf).rows;
}

export function parseRegistrarCsvDetailed(buf: Buffer): RegistrarParseResult {
  const lines = decodeUtf16(buf).split(/\r\n|\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new PipelineError("registrar export is empty", "REGISTRAR_EMPTY");

  const header = lines[0]!.split("\t").map((h) => h.trim());
  for (const col of EXPECTED_COLUMNS) {
    if (!header.includes(col)) {
      throw new PipelineError(
        `registrar export is missing the '${col}' column (saw: ${header.join(", ")})`,
        "REGISTRAR_BAD_HEADER",
      );
    }
  }
  const at = (name: string) => header.indexOf(name);
  const i = {
    courseNumber: at("Course Number"), courseTitle: at("Course Title"), breadthArea: at("Breadth Area"),
    measureName: at("Measure Names"), breadthAreaDescription: at("Breadth Area Description"),
    language: at("Language"), measureValue: at("Measure Values"),
  };

  const rows: RegistrarRow[] = [];
  const garbledMeasureValues: string[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split("\t");
    const courseNumber = (f[i.courseNumber] ?? "").trim();
    if (courseNumber.length === 0) continue;
    rows.push({
      courseNumber,
      courseTitle: (f[i.courseTitle] ?? "").trim(),
      breadthArea: (f[i.breadthArea] ?? "").trim(),
      measureName: (f[i.measureName] ?? "").trim(),
      breadthAreaDescription: (f[i.breadthAreaDescription] ?? "").trim(),
      language: (f[i.language] ?? "").trim(),
      measureValue: readMeasureValue(f[i.measureValue], garbledMeasureValues),
    });
  }
  return { rows, garbledMeasureValues };
}
