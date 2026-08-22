import { describe, expect, it } from "vitest";
import { formatAbsoluteUTC, formatRelative } from "@/lib/dates";

const now = new Date("2026-08-22T12:00:00Z");
const shift = (ms: number) => new Date(now.getTime() + ms);

describe("formatAbsoluteUTC", () => {
  it("renders a timezone-stable UTC string", () => {
    expect(formatAbsoluteUTC(new Date("2026-08-22T14:05:00Z"))).toBe(
      "Aug 22, 2026, 14:05 UTC",
    );
  });
});

describe("formatRelative", () => {
  it("picks the unit that matches the elapsed time", () => {
    expect(formatRelative(shift(-30_000), now)).toBe("30 seconds ago");
    expect(formatRelative(shift(-5 * 60_000), now)).toBe("5 minutes ago");
    expect(formatRelative(shift(-3 * 3_600_000), now)).toBe("3 hours ago");
    expect(formatRelative(shift(-2 * 365 * 86_400_000), now)).toBe("2 years ago");
  });

  it("uses natural phrasing for adjacent days", () => {
    expect(formatRelative(shift(-86_400_000), now)).toBe("yesterday");
  });

  it("handles future dates", () => {
    expect(formatRelative(shift(2 * 86_400_000), now)).toBe("in 2 days");
    expect(formatRelative(shift(21 * 86_400_000), now)).toBe("in 3 weeks");
  });
});
