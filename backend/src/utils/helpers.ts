import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export const generateId = (): string => uuidv4();

// Transaction reference
export const generateReference = (): string => `TXN-${uuidv4()}`;

// Opaque refresh token (stored hashed in DB)
export const generateRefreshToken = (): string =>
  crypto.randomBytes(32).toString("hex");

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

const DURATION_MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * DURATION_MULTIPLIERS.d;
  return parseInt(match[1], 10) * DURATION_MULTIPLIERS[match[2]];
};

export const expiresAtFromDuration = (duration: string): Date =>
  new Date(Date.now() + parseDurationToMs(duration));

// Adjutor Karma expects international format, e.g. +2348012345678
export const toKarmaPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return digits.length > 0 ? `+${digits}` : phone;
};

// Nigerian Naira formatting
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
};