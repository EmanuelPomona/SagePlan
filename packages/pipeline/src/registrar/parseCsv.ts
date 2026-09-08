import { PipelineError } from "../errors.ts";

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

export function parseRegistrarCsv(buf: Buffer): RegistrarRow[] {
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
      measureValue: Number((f[i.measureValue] ?? "0").trim()) || 0,
    });
  }
  return rows;
}
