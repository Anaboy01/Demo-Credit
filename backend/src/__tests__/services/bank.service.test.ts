import {
  getEligibleBanks,
  findEligibleBank,
  isValidNuban,
} from "../../services/bank.service";

describe("bank.service", () => {
  describe("getEligibleBanks", () => {
    it("returns UBA, OPay, and PalmPay", async () => {
      const banks = await getEligibleBanks();
      expect(banks).toHaveLength(3);
      expect(banks.map((b) => b.name)).toEqual(
        expect.arrayContaining(["UBA", "OPay", "PalmPay"])
      );
    });
  });

  describe("findEligibleBank", () => {
    it("finds a bank by code", async () => {
      const bank = await findEligibleBank("033");
      expect(bank?.name).toBe("UBA");
    });

    it("finds a bank by slug (case-insensitive)", async () => {
      const bank = await findEligibleBank("OPAY");
      expect(bank?.name).toBe("OPay");
    });

    it("finds a bank by name (case-insensitive)", async () => {
      const bank = await findEligibleBank("palmpay");
      expect(bank?.name).toBe("PalmPay");
    });

    it("returns undefined for unsupported banks", async () => {
      expect(await findEligibleBank("058")).toBeUndefined();
      expect(await findEligibleBank("gtbank")).toBeUndefined();
    });
  });

  describe("isValidNuban", () => {
    it("accepts a 10-digit account number", () => {
      expect(isValidNuban("0123456789")).toBe(true);
      expect(isValidNuban(" 0123456789 ")).toBe(true);
    });

    it("rejects invalid account numbers", () => {
      expect(isValidNuban("12345")).toBe(false);
      expect(isValidNuban("12345678901")).toBe(false);
      expect(isValidNuban("abcdefghij")).toBe(false);
      expect(isValidNuban("")).toBe(false);
    });
  });
});
