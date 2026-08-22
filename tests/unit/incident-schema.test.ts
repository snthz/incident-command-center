import { describe, expect, it } from "vitest";
import {
  createIncidentSchema,
  editIncidentSchema,
  incidentKeyPattern,
  parseDashboardView,
  parseIncidentFilters,
  postUpdateSchema,
  setDueDateSchema,
} from "@/features/incidents/schema";

const uuid = "0b9d54a2-4f6a-4d10-9c3a-2e8f13bb61aa";

describe("parseIncidentFilters", () => {
  it("accepts valid status, severity and query", () => {
    expect(
      parseIncidentFilters({ status: "investigating", severity: "critical", q: " db " }),
    ).toEqual({ status: "investigating", severity: "critical", q: "db" });
  });

  it("drops invalid values instead of throwing", () => {
    expect(
      parseIncidentFilters({ status: "exploded", severity: "apocalyptic" }),
    ).toEqual({ status: undefined, severity: undefined, q: undefined });
  });

  it("drops repeated params arriving as arrays", () => {
    expect(
      parseIncidentFilters({ status: ["investigating", "resolved"] }),
    ).toEqual({ status: undefined, severity: undefined, q: undefined });
  });

  it("drops an empty search string", () => {
    expect(parseIncidentFilters({ q: "   " }).q).toBeUndefined();
  });
});

describe("parseDashboardView", () => {
  it("returns list only for the exact value", () => {
    expect(parseDashboardView("list")).toBe("list");
  });

  it("falls back to board for anything else", () => {
    expect(parseDashboardView(undefined)).toBe("board");
    expect(parseDashboardView("timeline")).toBe("board");
    expect(parseDashboardView(["list"])).toBe("board");
  });
});

describe("incidentKeyPattern", () => {
  it("matches per-project keys regardless of case", () => {
    for (const key of ["CORE-7", "pay-12", "WEB-104", "icc-999999"]) {
      expect(incidentKeyPattern.test(key)).toBe(true);
    }
  });

  it("rejects malformed keys", () => {
    for (const key of ["CORE7", "C-1", "TOOLONGPREFIX-1", "CORE-1234567", "CORE-"]) {
      expect(incidentKeyPattern.test(key)).toBe(false);
    }
  });
});

describe("createIncidentSchema", () => {
  const base = {
    projectId: uuid,
    title: "Checkout latency above SLO",
    description: "p95 latency on the checkout API has been above 2s for 15 minutes.",
    severity: "high",
    ownerId: "",
    dueDate: "",
  };

  it("normalizes empty owner and due date to null", () => {
    const parsed = createIncidentSchema.parse(base);
    expect(parsed.ownerId).toBeNull();
    expect(parsed.dueDate).toBeNull();
  });

  it("stores the due date at noon UTC so it never shifts a day across timezones", () => {
    const parsed = createIncidentSchema.parse({ ...base, dueDate: "2026-09-01" });
    expect(parsed.dueDate?.toISOString()).toBe("2026-09-01T12:00:00.000Z");
  });

  it("rejects a malformed due date", () => {
    const result = createIncidentSchema.safeParse({ ...base, dueDate: "2026-9-1" });
    expect(result.success).toBe(false);
  });

  it("requires a descriptive title and description", () => {
    const result = createIncidentSchema.safeParse({
      ...base,
      title: "short",
      description: "too short",
    });
    expect(result.success).toBe(false);
    const fields = fieldMessages(result);
    expect(fields.title?.[0]).toMatch(/at least 8 characters/);
    expect(fields.description?.[0]).toMatch(/at least 20 characters/);
  });
});

function fieldMessages(result: {
  success: boolean;
  error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
}) {
  const fields: Record<string, string[]> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = String(issue.path[0]);
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

describe("editIncidentSchema", () => {
  it("requires at least one editable field", () => {
    expect(editIncidentSchema.safeParse({ id: uuid }).success).toBe(false);
  });

  it("accepts a title-only edit", () => {
    expect(
      editIncidentSchema.safeParse({ id: uuid, title: "Payments API degraded" }).success,
    ).toBe(true);
  });
});

describe("setDueDateSchema", () => {
  it("clears the due date with an empty string", () => {
    expect(setDueDateSchema.parse({ id: uuid, dueDate: "" }).dueDate).toBeNull();
  });
});

describe("postUpdateSchema", () => {
  it("trims the message and rejects whitespace-only updates", () => {
    const valid = postUpdateSchema.parse({
      id: uuid,
      incidentId: uuid,
      message: "  Mitigation deployed.  ",
    });
    expect(valid.message).toBe("Mitigation deployed.");
    expect(
      postUpdateSchema.safeParse({ id: uuid, incidentId: uuid, message: "   " }).success,
    ).toBe(false);
  });
});
