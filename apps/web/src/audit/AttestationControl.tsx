import { useId } from "react";
import type { Requirement } from "@gradguide/shared";

/**
 * The escape hatch. Some requirements are met in ways no data source records,
 * so the student can say so, and the row then says a human said so.
 */
export function AttestationControl({
  requirement,
  checked,
  onChange,
}: {
  requirement: Requirement;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  if (!requirement.attestable) return null;

  return (
    <div className="attestation">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{requirement.attestable.prompt}</label>
    </div>
  );
}
