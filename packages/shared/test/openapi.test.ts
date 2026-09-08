import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderOpenApiYaml } from "../scripts/emit-openapi.ts";

describe("docs/openapi.yaml", () => {
  it("is current with the schemas (run `npm run contract:openapi` if this fails)", () => {
    const committed = readFileSync(resolve(__dirname, "../../../docs/openapi.yaml"), "utf8");
    expect(committed).toBe(renderOpenApiYaml());
  });
});
