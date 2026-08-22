import { describe, expect, it } from "vitest";
import { signInSchema } from "@/features/auth/schema";

describe("signInSchema", () => {
  it("accepts a valid email and password", () => {
    expect(
      signInSchema.safeParse({ email: "axl.santos@icc.dev", password: "password123" })
        .success,
    ).toBe(true);
  });

  it("rejects a malformed email with a friendly message", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });

  it("requires a password", () => {
    const result = signInSchema.safeParse({ email: "axl.santos@icc.dev", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password is required.");
  });
});
