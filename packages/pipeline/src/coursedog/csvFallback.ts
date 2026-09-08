import { PipelineError } from "../errors.ts";
import type { RawCoursedogCourse } from "./raw.ts";

/**
 * RFC4180-ish CSV reader: quoted fields, doubled quotes, embedded commas and
 * newlines, CRLF or LF. Small and dependency-free on purpose.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let started = false;

  const endField = () => { row.push(field); field = ""; started = false; };
  const endRow = () => {
    endField();
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && !started) { inQuotes = true; started = true; continue; }
    if (ch === ",") { endField(); continue; }
    if (ch === "\r") { if (src[i + 1] === "\n") i++; endRow(); continue; }
    if (ch === "\n") { endRow(); continue; }
    field += ch;
    started = true;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

const norm = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/** Header aliases, so a slightly different export still parses. */
const COLUMNS: Record<string, string[]> = {
  code: ["coursecode", "code", "courseid", "course"],
  name: ["coursename", "name", "title", "coursetitle"],
  subjectCode: ["subjectcode", "subject"],
  courseNumber: ["coursenumber", "number"],
  status: ["status", "coursestatus"],
  description: ["description", "coursedescription"],
  gradeMode: ["grademode", "grading"],
  creditMin: ["credithoursmin", "creditsmin", "mincredits", "credithours", "credits"],
  creditMax: ["credithoursmax", "creditsmax", "maxcredits"],
  repeatable: ["repeatable"],
  numberOfRepeats: ["numberofrepeats", "repeats"],
  attributes: ["attributes", "courseattributes"],
  departments: ["departments", "department"],
};

function indexOfColumn(headers: string[], aliases: string[]): number {
  const normalised = headers.map(norm);
  for (const alias of aliases) {
    const i = normalised.indexOf(alias);
    if (i !== -1) return i;
  }
  return -1;
}

/**
 * Parse the catalog UI's "Export all results as CSV" into the same loose raw
 * shape the API returns, so ONE normaliser serves both paths.
 */
export function parseCoursedogCsv(text: string): RawCoursedogCourse[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) throw new PipelineError("CSV is empty", "CSV_EMPTY");

  const headers = rows[0]!;
  const idx: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(COLUMNS)) idx[key] = indexOfColumn(headers, aliases);
  if (idx.code === -1) {
    throw new PipelineError(`CSV has no recognisable course-code column (saw: ${headers.join(", ")})`, "CSV_NO_CODE_COLUMN");
  }

  const cell = (row: string[], key: string): string | undefined => {
    const i = idx[key];
    if (i === undefined || i === -1) return undefined;
    const v = row[i];
    return v === undefined || v === "" ? undefined : v;
  };
  const num = (v: string | undefined): number | undefined => {
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const out: RawCoursedogCourse[] = [];
  for (const row of rows.slice(1)) {
    if (row.every((c) => c.trim() === "")) continue;
    const min = num(cell(row, "creditMin"));
    const max = num(cell(row, "creditMax")) ?? min;
    const attributesCell = cell(row, "attributes");
    out.push({
      code: cell(row, "code"),
      name: cell(row, "name"),
      subjectCode: cell(row, "subjectCode"),
      courseNumber: cell(row, "courseNumber"),
      status: cell(row, "status"),
      description: cell(row, "description") ?? "",
      gradeMode: cell(row, "gradeMode") ?? "",
      departments: cell(row, "departments")?.split("|").map((s) => s.trim()).filter(Boolean),
      attributes: attributesCell ? attributesCell.split("|").map((s) => s.trim()).filter(Boolean) : [],
      credits: {
        repeatable: cell(row, "repeatable") === "true",
        numberOfRepeats: num(cell(row, "numberOfRepeats")),
        creditHours: { min, max },
      },
    });
  }
  return out;
}
