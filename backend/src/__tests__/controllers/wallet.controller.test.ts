jest.mock("../../config/db", () => ({
  __esModule: true,
  default: require("../helpers/mockDb").createMockDb(),
}));

jest.mock("../../middlewares/auth.middleware", () => ({
  protect: (req: import("express").Request, _res: import("express").Response, next: import("express").NextFunction) => {
    req.user = { userId: "user-1", email: "sender@example.com" };
    next();
  },
}));

import request from "supertest";
import app from "../../app";
import db from "../../config/db";
import { createMockDb } from "../helpers/mockDb";

const mockDb = db as unknown as ReturnType<typeof createMockDb>;

describe("wallet routes", () => {
  beforeEach(() => {
    mockDb.reset();
  });

  describe("GET /api/wallet/balance", () => {
    it("returns the wallet balance", async () => {
      const walletsChain = mockDb.mockTable("wallets");
      walletsChain.first.mockResolvedValue({ balance: 5000 });
      walletsChain.select.mockReturnValue(walletsChain);
      walletsChain.where.mockReturnValue(walletsChain);

      const response = await request(app).get("/api/wallet/balance");

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(5000);
      expect(response.body.formatted).toContain("5,000");
    });

    it("returns 404 when wallet is missing", async () => {
      const walletsChain = mockDb.mockTable("wallets");
      walletsChain.first.mockResolvedValue(undefined);
      walletsChain.select.mockReturnValue(walletsChain);
      walletsChain.where.mockReturnValue(walletsChain);

      const response = await request(app).get("/api/wallet/balance");

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Wallet not found");
    });
  });

  describe("POST /api/wallet/fund", () => {
    it("funds the wallet with a valid amount", async () => {
      mockDb.mockTable("wallets");
      mockDb.mockTable("transactions");

      const response = await request(app)
        .post("/api/wallet/fund")
        .send({ amount: 2500 });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("Wallet funded successfully");
      expect(response.body.reference).toMatch(/^TXN-/);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("rejects invalid fund amounts", async () => {
      const response = await request(app)
        .post("/api/wallet/fund")
        .send({ amount: 0 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("valid amount");
    });
  });

  describe("POST /api/wallet/send", () => {
    it("transfers funds to a recipient", async () => {
      const usersChain = mockDb.mockTable("users");
      usersChain.first
        .mockResolvedValueOnce({ phone: "08011112222" })
        .mockResolvedValueOnce({ id: "user-2", name: "Recipient" });
      usersChain.select.mockReturnValue(usersChain);
      usersChain.where.mockReturnValue(usersChain);

      const walletsChain = mockDb.mockTable("wallets");
      walletsChain.first.mockResolvedValue({ balance: 10000 });
      walletsChain.select.mockReturnValue(walletsChain);
      walletsChain.where.mockReturnValue(walletsChain);
      walletsChain.forUpdate.mockReturnValue(walletsChain);

      mockDb.mockTable("transactions");

      const response = await request(app)
        .post("/api/wallet/send")
        .send({ recipientPhone: "08033334444", amount: 1500 });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("sent to Recipient successfully");
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("rejects self-transfers", async () => {
      const usersChain = mockDb.mockTable("users");
      usersChain.first.mockResolvedValue({ phone: "08011112222" });
      usersChain.select.mockReturnValue(usersChain);
      usersChain.where.mockReturnValue(usersChain);

      const response = await request(app)
        .post("/api/wallet/send")
        .send({ recipientPhone: "08011112222", amount: 100 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("cannot send money to yourself");
    });

    it("rejects transfers when recipient is not found", async () => {
      const usersChain = mockDb.mockTable("users");
      usersChain.first
        .mockResolvedValueOnce({ phone: "08011112222" })
        .mockResolvedValueOnce(undefined);
      usersChain.select.mockReturnValue(usersChain);
      usersChain.where.mockReturnValue(usersChain);

      const response = await request(app)
        .post("/api/wallet/send")
        .send({ recipientPhone: "08099990000", amount: 100 });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("No account found");
    });

    it("rejects transfers with insufficient balance", async () => {
      const usersChain = mockDb.mockTable("users");
      usersChain.first
        .mockResolvedValueOnce({ phone: "08011112222" })
        .mockResolvedValueOnce({ id: "user-2", name: "Recipient" });
      usersChain.select.mockReturnValue(usersChain);
      usersChain.where.mockReturnValue(usersChain);

      const walletsChain = mockDb.mockTable("wallets");
      walletsChain.first.mockResolvedValue({ balance: 50 });
      walletsChain.select.mockReturnValue(walletsChain);
      walletsChain.where.mockReturnValue(walletsChain);
      walletsChain.forUpdate.mockReturnValue(walletsChain);

      const response = await request(app)
        .post("/api/wallet/send")
        .send({ recipientPhone: "08033334444", amount: 1000 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Insufficient balance");
    });
  });

  describe("POST /api/wallet/withdraw", () => {
    it("withdraws to an eligible bank", async () => {
      const walletsChain = mockDb.mockTable("wallets");
      walletsChain.first.mockResolvedValue({ balance: 20000 });
      walletsChain.select.mockReturnValue(walletsChain);
      walletsChain.where.mockReturnValue(walletsChain);
      walletsChain.forUpdate.mockReturnValue(walletsChain);

      mockDb.mockTable("transactions");

      const response = await request(app)
        .post("/api/wallet/withdraw")
        .send({
          amount: 5000,
          bankCode: "033",
          accountNumber: "0123456789",
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("withdrawn to UBA successfully");
      expect(response.body.bank.name).toBe("UBA");
      expect(response.body.balance).toBe(15000);
    });

    it("rejects invalid NUBAN account numbers", async () => {
      const response = await request(app)
        .post("/api/wallet/withdraw")
        .send({
          amount: 1000,
          bankCode: "033",
          accountNumber: "123",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("valid 10-digit NUBAN");
    });

    it("rejects unsupported banks", async () => {
      const response = await request(app)
        .post("/api/wallet/withdraw")
        .send({
          amount: 1000,
          bankCode: "058",
          accountNumber: "0123456789",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Bank not eligible");
    });

    it("rejects withdrawal when balance is insufficient", async () => {
      const walletsChain = mockDb.mockTable("wallets");
      walletsChain.first.mockResolvedValue({ balance: 100 });
      walletsChain.select.mockReturnValue(walletsChain);
      walletsChain.where.mockReturnValue(walletsChain);
      walletsChain.forUpdate.mockReturnValue(walletsChain);

      const response = await request(app)
        .post("/api/wallet/withdraw")
        .send({
          amount: 5000,
          bankCode: "opay",
          accountNumber: "0123456789",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Insufficient balance");
    });
  });

  describe("GET /api/wallet/banks", () => {
    it("lists eligible withdrawal banks", async () => {
      const response = await request(app).get("/api/wallet/banks");

      expect(response.status).toBe(200);
      expect(response.body.banks).toHaveLength(3);
      expect(response.body.banks.map((b: { name: string }) => b.name)).toEqual(
        expect.arrayContaining(["UBA", "OPay", "PalmPay"])
      );
    });
  });
});
