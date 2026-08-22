import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

function requestFor(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function signedIn() {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
}

function signedOut() {
  getUser.mockResolvedValue({ data: { user: null } });
}

describe("proxy auth gate", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("redirects a signed-out visit to a protected page toward /login with redirectTo", async () => {
    signedOut();
    const response = await proxy(requestFor("/dashboard"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirectTo")).toBe("/dashboard");
  });

  it("keeps the full path and query inside redirectTo", async () => {
    signedOut();
    const response = await proxy(requestFor("/incidents/CORE-7?tab=history"));
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("redirectTo")).toBe(
      "/incidents/CORE-7?tab=history",
    );
  });

  it("sends a signed-out visit to / straight to /login without redirectTo", async () => {
    signedOut();
    const response = await proxy(requestFor("/"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.has("redirectTo")).toBe(false);
  });

  it("lets signed-out visitors reach public routes", async () => {
    signedOut();
    for (const path of ["/login", "/about-severities"]) {
      const response = await proxy(requestFor(path));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("sends signed-in users away from /login and / toward /dashboard", async () => {
    signedIn();
    for (const path of ["/login", "/"]) {
      const response = await proxy(requestFor(path));
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/dashboard");
    }
  });

  it("passes signed-in users through to protected routes", async () => {
    signedIn();
    const response = await proxy(requestFor("/incidents/CORE-7"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
