import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiRequest, clearAuth, getToken, login } from "./auth";

const browser = new EventTarget();
const values = new Map<string, string>();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalFetch = globalThis.fetch;
const response = (token = "session-a") => Response.json({
  token, expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: "user-a", name: "Test", email: "test@example.com", role: "admin" },
});

beforeEach(async () => {
  values.clear();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(browser, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  globalThis.fetch = async () => response();
  await login("test@example.com", "password123");
});

afterEach(() => {
  clearAuth();
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

describe("back office API sessions", () => {
  it("retains the current tab login when storage is unavailable", async () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    Object.defineProperty(browser, "localStorage", { configurable: true, value: blocked });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: blocked });
    await login("test@example.com", "password123");
    assert.equal(getToken(), "session-a");
    clearAuth();
    assert.equal(getToken(), null);
  });

  it("preserves caller Headers and attaches authentication", async () => {
    globalThis.fetch = async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-trace"), "audit");
      assert.equal(headers.get("authorization"), "Bearer session-a");
      return Response.json({ ok: true });
    };
    await apiRequest("/admin/overview", { headers: new Headers({ "X-Trace": "audit" }) });
  });

  it("clears the rejected session on 401 and parses null error bodies", async () => {
    globalThis.fetch = async () => Response.json(null, { status: 401 });
    await assert.rejects(apiRequest("/admin/overview"), /401/);
    assert.equal(getToken(), null);
  });

  it("keeps a replacement login when an older request fails", async () => {
    globalThis.fetch = async () => {
      globalThis.fetch = async () => response("session-b");
      await login("test@example.com", "password123");
      return Response.json({ message: "expired" }, { status: 401 });
    };
    await assert.rejects(apiRequest("/admin/overview"), /expired/);
    assert.equal(getToken(), "session-b");
  });

  it("does not clear the current session for a rejected explicit Authorization header", async () => {
    globalThis.fetch = async () => Response.json({ message: "expired" }, { status: 401 });
    await assert.rejects(apiRequest("/admin/overview", { headers: { Authorization: "Bearer other" } }), /expired/);
    assert.equal(getToken(), "session-a");
  });
});
