import {
  generateId,
  generateReference,
  generateRefreshToken,
  hashToken,
  parseDurationToMs,
  expiresAtFromDuration,
  toKarmaPhone,
  formatNaira,
} from "../../utils/helpers";

describe("helpers", () => {
  describe("generateId", () => {
    it("returns a valid UUID", () => {
      expect(generateId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("returns unique values", () => {
      expect(generateId()).not.toBe(generateId());
    });
  });

  describe("generateReference", () => {
    it("prefixes transaction references with TXN-", () => {
      expect(generateReference()).toMatch(/^TXN-/);
    });
  });

  describe("generateRefreshToken", () => {
    it("returns a 64-character hex string", () => {
      expect(generateRefreshToken()).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("hashToken", () => {
    it("returns a deterministic SHA-256 hex digest", () => {
      const hash = hashToken("my-token");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hashToken("my-token")).toBe(hash);
    });

    it("produces different hashes for different tokens", () => {
      expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
    });
  });

  describe("parseDurationToMs", () => {
    it("parses seconds, minutes, hours, and days", () => {
      expect(parseDurationToMs("30s")).toBe(30_000);
      expect(parseDurationToMs("15m")).toBe(900_000);
      expect(parseDurationToMs("2h")).toBe(7_200_000);
      expect(parseDurationToMs("7d")).toBe(604_800_000);
    });

    it("defaults to 7 days for invalid formats", () => {
      expect(parseDurationToMs("invalid")).toBe(604_800_000);
    });
  });

  describe("expiresAtFromDuration", () => {
    it("returns a future date based on the duration", () => {
      const before = Date.now();
      const expiresAt = expiresAtFromDuration("1h");
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3_600_000 - 100);
    });
  });

  describe("toKarmaPhone", () => {
    it("converts local Nigerian numbers to +234 format", () => {
      expect(toKarmaPhone("08012345678")).toBe("+2348012345678");
    });

    it("preserves numbers already in 234 format", () => {
      expect(toKarmaPhone("2348012345678")).toBe("+2348012345678");
    });

    it("strips non-digit characters", () => {
      expect(toKarmaPhone("+234 801 234 5678")).toBe("+2348012345678");
    });

    it("returns original input when no digits are present", () => {
      expect(toKarmaPhone("abc")).toBe("abc");
    });
  });

  describe("formatNaira", () => {
    it("formats amounts as Nigerian Naira", () => {
      expect(formatNaira(1500)).toContain("1,500");
      expect(formatNaira(1500)).toMatch(/₦|NGN/);
    });
  });
});
