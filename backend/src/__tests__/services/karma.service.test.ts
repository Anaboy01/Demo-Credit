import {
  isKarmaHit,
  lookupKarmaIdentity,
  isRegistrationBlocked,
} from "../../services/karma.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("karma.service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("isKarmaHit", () => {
    it("returns true when identity is on the blacklist", () => {
      expect(
        isKarmaHit({
          status: "success",
          message: "Successful",
          data: { karma_identity: "test@example.com" },
        })
      ).toBe(true);
    });

    it("returns false when identity is not blacklisted", () => {
      expect(isKarmaHit({ status: "error", message: "Not found" })).toBe(
        false
      );
      expect(
        isKarmaHit({ status: "success", message: "Successful" })
      ).toBe(false);
      expect(
        isKarmaHit({
          status: "success",
          message: "Successful",
          data: undefined,
        })
      ).toBe(false);
    });
  });

  describe("lookupKarmaIdentity", () => {
    it("returns parsed JSON on success", async () => {
      const payload = {
        status: "success",
        message: "Successful",
        data: { karma_identity: "bad@example.com" },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => payload,
      });

      await expect(lookupKarmaIdentity("bad@example.com")).resolves.toEqual(
        payload
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://adjutor.lendsqr.com/v2/verification/karma/bad%40example.com",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-adjutor-key",
          }),
        })
      );
    });

    it("throws when the API key is rejected", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

      await expect(lookupKarmaIdentity("test@example.com")).rejects.toThrow(
        "Adjutor rejected the API key or Karma scope."
      );
    });

    it("throws when the network request fails", async () => {
      mockFetch.mockRejectedValue(new Error("network error"));

      await expect(lookupKarmaIdentity("test@example.com")).rejects.toThrow(
        "Adjutor Karma lookup request failed."
      );
    });

    it("throws on unexpected HTTP errors", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

      await expect(lookupKarmaIdentity("test@example.com")).rejects.toThrow(
        "Adjutor Karma lookup failed with status 500."
      );
    });
  });

  describe("isRegistrationBlocked", () => {
    it("returns true when email is blacklisted", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: "success",
            message: "Successful",
            data: { karma_identity: "bad@example.com" },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: "error", message: "Not found" }),
        });

      await expect(
        isRegistrationBlocked("bad@example.com", "08012345678")
      ).resolves.toBe(true);
    });

    it("returns true when phone is blacklisted", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: "error", message: "Not found" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: "success",
            message: "Successful",
            data: { karma_identity: "+2348012345678" },
          }),
        });

      await expect(
        isRegistrationBlocked("good@example.com", "08012345678")
      ).resolves.toBe(true);
    });

    it("returns false when neither email nor phone is blacklisted", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ status: "error", message: "Not found" }),
      });

      await expect(
        isRegistrationBlocked("good@example.com", "08099998888")
      ).resolves.toBe(false);
    });
  });
});
