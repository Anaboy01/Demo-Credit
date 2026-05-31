jest.mock("../../config/db", () => ({
  __esModule: true,
  default: require("../helpers/mockDb").createMockDb(),
}));

jest.mock("../../services/karma.service", () => ({
  isRegistrationBlocked: jest.fn(),
}));

import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../app";
import db from "../../config/db";
import { isRegistrationBlocked } from "../../services/karma.service";
import { createMockDb } from "../helpers/mockDb";

const mockDb = db as unknown as ReturnType<typeof createMockDb>;
const mockIsRegistrationBlocked = isRegistrationBlocked as jest.MockedFunction<
  typeof isRegistrationBlocked
>;

describe("auth routes", () => {
  beforeEach(() => {
    mockDb.reset();
    mockIsRegistrationBlocked.mockReset();
  });

  describe("POST /api/auth/register", () => {
    const validPayload = {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "08012345678",
      password: "SecurePass123",
    };

    it("creates an account and wallet on success", async () => {
      mockDb.mockTable("users").resolveWith([]);

      mockIsRegistrationBlocked.mockResolvedValue(false);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("Account created successfully");
      expect(response.body.user).toMatchObject({
        name: validPayload.name,
        email: validPayload.email,
        phone: validPayload.phone,
      });
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("rejects registration when required fields are missing", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "jane@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Please provide name, email, phone, and password");
    });

    it("rejects duplicate email or phone", async () => {
      mockDb.mockTable("users").resolveWith([{ id: "existing-user" }]);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validPayload);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("already registered");
    });

    it("blocks registration when Karma blacklists the identity", async () => {
      mockDb.mockTable("users").resolveWith([]);

      mockIsRegistrationBlocked.mockResolvedValue(true);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validPayload);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Registration denied");
    });

    it("returns 503 when Karma verification is unavailable", async () => {
      mockDb.mockTable("users").resolveWith([]);

      mockIsRegistrationBlocked.mockRejectedValue(new Error("service down"));

      const response = await request(app)
        .post("/api/auth/register")
        .send(validPayload);

      expect(response.status).toBe(503);
      expect(response.body.message).toContain("Unable to complete identity verification");
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns tokens for valid credentials", async () => {
      const hashedPassword = await bcrypt.hash("SecurePass123", 12);
      mockDb.mockTable("users").resolveWith({
        id: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "08012345678",
        password: hashedPassword,
      });

      mockDb.mockTable("refresh_tokens");

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "jane@example.com", password: "SecurePass123" });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe("jane@example.com");
    });

    it("rejects login when credentials are missing", async () => {
      const response = await request(app).post("/api/auth/login").send({ email: "jane@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Please provide email and password");
    });

    it("rejects invalid credentials", async () => {
      mockDb.mockTable("users").resolveWith(undefined);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "missing@example.com", password: "wrong" });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Invalid email or password");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("rejects requests without a refresh token", async () => {
      const response = await request(app).post("/api/auth/refresh").send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Please provide a refresh token");
    });

    it("rejects invalid refresh tokens", async () => {
      mockDb.mockTable("refresh_tokens as rt").resolveWith(undefined);

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Invalid refresh token");
    });
  });
});
