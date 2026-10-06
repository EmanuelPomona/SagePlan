import type { Manifest } from "@sageplan/shared";
import { ThemeToggle } from "./ThemeToggle.tsx";

/** Exact wording required by AC-P13. Not paraphrased anywhere. */
export const DISCLAIMER =
  "The Registrar's official audit is the source of truth. Confirm with your advisor before registering.";

const PORTAL_URL = "https://my.pomona.edu";

function academicYearStart(now: Date): number {
  // An academic year starts in the autumn: before July we are still in the year
  // that began last calendar year.
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

export function isStale(catalogYear: string, now = new Date()): boolean {
  const endYear = Number(catalogYear.split("-")[1]);
  if (!Number.isFinite(endYear)) return false;
  return endYear <= academicYearStart(now);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * A colophon, not a status bar. The brief's sketch strings the metadata together
 * with middle dots; that separator is one of the commonest tells of generated
 * design and it also reads badly at 390px, so the same facts are set as a
 * labelled pair instead.
 */
export function Masthead({ manifest, fixture }: { manifest: Manifest | null; fixture: boolean }) {
  const stale = manifest ? isStale(manifest.catalogYear) : false;

  return (
    <header className="masthead">
      <div className="masthead-top">
        <h1 className="masthead-name">
          Pomona GradGuide <span className="masthead-unofficial">unofficial</span>
        </h1>
        <ThemeToggle />
      </div>

      {manifest && (
        <dl className="colophon">
          <div>
            <dt>Catalog</dt>
            <dd>{manifest.catalogYear}</dd>
          </div>
          <div>
            <dt>Data as of</dt>
            <dd>
              <time dateTime={manifest.generatedAt}>{formatDate(manifest.generatedAt)}</time>
            </dd>
          </div>
        </dl>
      )}

      {fixture && (
        <p className="banner banner-fixture" role="status">
          <strong>Sample data.</strong> Course listings on this page are a small
          development fixture, not the Pomona catalog. Nothing here reflects real
          course offerings.
        </p>
      )}

      {stale && manifest && (
        <p className="banner banner-stale" role="status">
          <strong>This catalog is out of date.</strong> These requirements come
          from the {manifest.catalogYear} catalog, which has ended. Check the
          current catalog before relying on anything below.
        </p>
      )}

      <p className="disclaimer">
        {DISCLAIMER}{" "}
        <a href={PORTAL_URL} rel="noreferrer noopener">
          Open the Student Portal
        </a>
      </p>
    </header>
  );
}
