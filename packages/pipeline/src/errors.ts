/**
 * One typed error for the whole pipeline. It carries the upstream HTTP status
 * where there is one, because the catalog command's hard guard is specifically
 * "401/403 -> fail, keep yesterday's data" (docs/API.md section 4, validator 2).
 */
export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PipelineError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 4xx is the upstream telling us we are wrong; retrying repeats the mistake.
 * 5xx and transport errors are worth another attempt.
 */
export function isRetriableStatus(status: number): boolean {
  if (status === 408 || status === 429) return true;
  return status >= 500;
}
