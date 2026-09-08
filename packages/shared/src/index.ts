/**
 * @gradguide/shared — THE CONTRACT.
 *
 * zod schemas are the single machine-checkable artifact for every boundary on
 * this project: pipeline -> /data files -> web app, and engine -> web app.
 * docs/openapi.yaml is GENERATED from these schemas (npm run contract:openapi);
 * docs/API.md is the prose twin. Owner: manager. Workers request changes via
 * docs/AGENT_PROTOCOL.md section 6.
 */
export * from "./ids.ts";
export * from "./rule.ts";
export * from "./catalog.ts";
export * from "./program.ts";
export * from "./plan.ts";
export * from "./result.ts";
export * from "./grades.ts";
export * from "./artefacts.ts";
export * from "./registry.ts";
