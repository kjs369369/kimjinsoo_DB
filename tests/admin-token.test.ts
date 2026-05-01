import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.resetModules();
  process.env.VAULT_PASSWORD = "test-password-12345";
});

describe("admin-token", () => {
  it("발급한 토큰을 검증할 수 있다", async () => {
    const { issueAdminToken, verifyAdminToken } = await import("@/lib/admin-token");
    const token = issueAdminToken();
    expect(verifyAdminToken(token)).toBe(true);
  });

  it("위조된 토큰은 거부한다", async () => {
    const { verifyAdminToken } = await import("@/lib/admin-token");
    expect(verifyAdminToken("admin.9999999999999.abc123")).toBe(false);
  });

  it("형식이 잘못된 토큰은 거부한다", async () => {
    const { verifyAdminToken } = await import("@/lib/admin-token");
    expect(verifyAdminToken("garbage")).toBe(false);
    expect(verifyAdminToken(null)).toBe(false);
    expect(verifyAdminToken("")).toBe(false);
  });

  it("만료된 토큰은 거부한다", async () => {
    const { issueAdminToken, verifyAdminToken } = await import("@/lib/admin-token");
    const token = issueAdminToken();
    const [role, _exp, sig] = token.split(".");
    const expired = `${role}.${Date.now() - 1000}.${sig}`;
    expect(verifyAdminToken(expired)).toBe(false);
  });
});
