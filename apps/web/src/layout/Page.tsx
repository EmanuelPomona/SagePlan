import { useAudit } from "../audit/useAudit.ts";
import { AuditSection } from "../audit/AuditSection.tsx";
import { useData } from "../data/DataProvider.tsx";
import { usePlan } from "../plan/planStore.ts";
import { RecordSection } from "../record/RecordSection.tsx";
import { ExportImport } from "../share/ExportImport.tsx";
import { Footer } from "./Footer.tsx";
import { Masthead } from "./Masthead.tsx";

/**
 * The one page. No router, no tabs, no navigation to another view: every screen
 * in the brief is a section or an inline disclosure on this document.
 */
export function Page() {
  const data = useData();
  const plan = usePlan();

  if (data.status === "loading") {
    return (
      <>
        <Masthead manifest={null} fixture={false} />
        <main className="page">
          <p className="loading" role="status">
            Loading the catalog.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (data.status === "error") {
    return (
      <>
        <Masthead manifest={null} fixture={false} />
        <main className="page">
          <section className="section" aria-labelledby="unavailable-heading">
            <h2 id="unavailable-heading">The catalog data is not available</h2>
            <p className="error-detail" role="alert">
              {describeError(data.error.kind)} The file was{" "}
              <code>{data.error.path}</code>.
            </p>
            <p className="error-detail-technical">{data.error.detail}</p>
            <p>
              Your own record is safe: it is stored in this browser and does not
              depend on this file.
            </p>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return <Ready data={data} plan={plan} />;
}

function Ready({
  data,
  plan,
}: {
  data: Extract<ReturnType<typeof useData>, { status: "ready" }>;
  plan: ReturnType<typeof usePlan>;
}) {
  const results = useAudit(plan.plan, data.programs, data.catalog.courses);

  return (
    <>
      <Masthead manifest={data.manifest} fixture={data.fixture} />
      <main className="page">
        {plan.status === "corrupt" && (
          <p className="banner banner-problem" role="alert">
            <strong>Your saved record could not be read.</strong> It has been left
            untouched and this page has started from an empty record. Nothing was
            deleted, and the unreadable text is still in this browser.
          </p>
        )}
        {plan.status === "quota" && (
          <p className="banner banner-problem" role="alert">
            <strong>This browser will not save any more.</strong> Your latest
            changes are on screen but were not stored, so they will be lost if you
            reload. Export your record to keep it.
          </p>
        )}
        <RecordSection plan={plan} catalog={data.catalog.courses} rules={data.rules} />
        <AuditSection programs={data.programs} results={results} plan={plan} catalog={data.catalog.courses} />
      </main>
      <Footer>
        <ExportImport plan={plan} />
      </Footer>
    </>
  );
}

function describeError(kind: "notFound" | "badJson" | "schema" | "network"): string {
  switch (kind) {
    case "notFound":
      return "A file this page needs is missing.";
    case "badJson":
      return "A file this page needs is damaged and could not be read.";
    case "schema":
      return "A file this page needs is not in the shape this version expects.";
    case "network":
      return "A file this page needs could not be fetched.";
  }
}
