import { describe, expect, test } from "vitest";
import { authenticate } from "./auth.js";
import { buildApp } from "./app.js";
import { apiKeys, users } from "./store.js";
describe("planted API bugs", () => {
  test.fails("rejects inactive keys", () => {
    expect(authenticate("revoked-token")).toBeNull();
  });
  test("does not trust admin role from body", async () => {
    const app = buildApp();
    const liveToken = apiKeys.find((k) => k.id === "key_live")!.token;
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/users",
      headers: { authorization: "Bearer " + liveToken },
      payload: { role: "admin" },
    });
    expect(res.json().ok).toBe(false);
  });
  test("allows admin access from authenticated server-side role", async () => {
    const adminKey = {
      id: "key_admin",
      token: "admin-token",
      userId: "u_admin",
      active: true,
    };
    const adminUser = { id: "u_admin", role: "admin", orgId: "org_a" } as const;
    apiKeys.push(adminKey);
    users.push(adminUser);
    try {
      const app = buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/users",
        headers: { authorization: "Bearer " + adminKey.token },
        payload: { role: "member" },
      });
      expect(res.json()).toEqual({ ok: true, granted: "admin" });
    } finally {
      apiKeys.splice(apiKeys.indexOf(adminKey), 1);
      users.splice(users.indexOf(adminUser), 1);
    }
  });
  test("server responds", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "POST", url: "/api/tokens" });
    expect(res.statusCode).toBe(200);
  });
});
