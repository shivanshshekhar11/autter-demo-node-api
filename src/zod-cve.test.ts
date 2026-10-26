import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { buildApp } from "./app.js";

// GHSA-mrhx-c7xc-m3w5: zod must be bumped to >= 4.6.6.
const FIXED = [4, 6, 6];

function versionAtLeast(version: string): boolean {
  const parts = version.split(".").map(Number);
  for (let i = 0; i < FIXED.length; i++) {
    if (parts[i] > FIXED[i]) return true;
    if (parts[i] < FIXED[i]) return false;
  }
  return true;
}

describe("zod CVE bump (GHSA-mrhx-c7xc-m3w5)", () => {
  test("lockfile resolves zod to the fixed version", () => {
    const lock = JSON.parse(
      readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
    );
    const zodEntry = lock.packages["node_modules/zod"];
    expect(zodEntry).toBeTruthy();
    expect(versionAtLeast(zodEntry.version)).toBe(true);
    expect(zodEntry.version.split(".")[0]).toBe("4");
  });

  test("installed zod is the fixed version", () => {
    const pkgPath = new URL("../node_modules/zod/package.json", import.meta.url);
    expect(existsSync(pkgPath)).toBe(true);
    const zodPkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(versionAtLeast(zodPkg.version)).toBe(true);
    expect(zodPkg.version.split(".")[0]).toBe("4");
  });

  test("projects endpoint still validates nested config via zod", async () => {
    const app = buildApp();

    const ok = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "atlas", config: { retries: 3 }, unknownField: true },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ name: "atlas", config: { retries: 3 } });

    const invalid = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: 42 },
    });
    expect(invalid.statusCode).toBe(500);
  });
});
