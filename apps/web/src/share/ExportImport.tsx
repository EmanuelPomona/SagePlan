import { useId, useRef, useState } from "react";
import type { StudentPlan } from "@sageplan/shared";
import { migratePlan } from "../plan/migratePlan.ts";
import type { PlanStore } from "../plan/planStore.ts";
import { ImportPreview } from "./ImportPreview.tsx";
import { download } from "./exportPlan.ts";
import { FRAGMENT_PREFIX, SHARE_LINK_WARN_LENGTH, encodePlan } from "./shareLink.ts";

type Pending = { plan: StudentPlan; source: string } | null;

export function ExportImport({ plan }: { plan: PlanStore }) {
  const [pending, setPending] = useState<Pending>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    setProblem(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setProblem(`${file.name} is not a readable JSON file.`);
      return;
    }
    const migrated = migratePlan(parsed);
    if (!migrated.ok) {
      setProblem(migrated.detail);
      return;
    }
    setPending({ plan: migrated.plan, source: `From the file ${file.name}` });
  };

  const copyShareLink = async () => {
    const encoded = await encodePlan(plan.plan);
    const url = `${window.location.origin}${window.location.pathname}${FRAGMENT_PREFIX}${encoded}`;
    setTooLong(url.length > SHARE_LINK_WARN_LENGTH);
    try {
      await navigator.clipboard.writeText(url);
      setCopied("Link copied.");
    } catch {
      setCopied(url);
    }
  };

  return (
    <div className="export-import">
      <div className="share-actions">
        <button type="button" onClick={() => download(plan.plan)}>Export my record</button>

        <label htmlFor={fileId} className="file-label">
          Import a file
          <input
            id={fileId}
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </label>

        <button type="button" onClick={() => void copyShareLink()}>Copy a share link</button>

        {plan.status === "corrupt" && plan.rawStored() !== null && (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              const raw = plan.rawStored();
              if (raw === null) return;
              const url = URL.createObjectURL(new Blob([raw], { type: "text/plain" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "sageplan-unreadable-record.txt";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
          >
            Download the record that could not be read
          </button>
        )}
      </div>

      {copied && (
        <p className="share-note" role="status">
          {copied}{" "}
          <strong>This link contains your own course record. Share it deliberately.</strong>
        </p>
      )}

      {tooLong && (
        <p className="share-note share-warning" role="alert">
          That link is long enough that some apps will cut it in half. Export a
          file instead if it does not paste cleanly.
        </p>
      )}

      {problem && <p className="share-note share-warning" role="alert">{problem}</p>}

      {pending && (
        <ImportPreview
          plan={pending.plan}
          source={pending.source}
          onReplace={() => {
            plan.replacePlan(pending.plan);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
