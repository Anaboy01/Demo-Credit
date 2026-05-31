import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db";
import {
  generateId,
  generateRefreshToken,
  hashToken,
  expiresAtFromDuration,
} from "../utils/helpers";
import { User } from "../types";

const signAccessToken = (user: Pick<User, "id" | "email">): string =>
  jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" } as jwt.SignOptions
  );

const createRefreshToken = async (userId: string): Promise<string> => {
  const refreshToken = generateRefreshToken();
  const refreshDuration = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const expiresAt = expiresAtFromDuration(refreshDuration);

  await db("refresh_tokens").insert({
    id: generateId(),
    user_id: userId,
    token_hash: hashToken(refreshToken),
    expires_at: expiresAt,
  });

  return refreshToken;
};

const issueAuthTokens = async (
  user: Pick<User, "id" | "email">
): Promise<{ token: string; refreshToken: string }> => ({
  token: signAccessToken(user),
  refreshToken: await createRefreshToken(user.id),
});

// Logout
// Required fields: { Authorization: Bearer <token> }
// Optional body: { refreshToken } — revokes that refresh token; otherwise revokes all for the user
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader!.split(" ")[1];
  const { refreshToken } = req.body;

  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const expiredAt = new Date((decoded.exp as number) * 1000);

  await db("token_blacklist").insert({
    id: generateId(),
    token,
    user_id: req.user!.userId,
    expired_at: expiredAt,
  });

  if (refreshToken) {
    await db("refresh_tokens")
      .where({ token_hash: hashToken(refreshToken) })
      .del();
  } else {
    await db("refresh_tokens").where({ user_id: req.user!.userId }).del();
  }

  res.json({ message: "Logged out successfully." });
});

// Refresh access token
// Required fields: { refreshToken }
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400);
    throw new Error("Please provide a refresh token.");
  }

  const tokenHash = hashToken(refreshToken);

  const stored = await db("refresh_tokens as rt")
    .join("users as u", "u.id", "rt.user_id")
    .select("rt.user_id", "rt.expires_at", "u.email")
    .where("rt.token_hash", tokenHash)
    .first();

  if (!stored) {
    res.status(401);
    throw new Error("Invalid refresh token. Please login again.");
  }

  if (new Date(stored.expires_at) < new Date()) {
    await db("refresh_tokens").where({ token_hash: tokenHash }).del();
    res.status(401);
    throw new Error("Refresh token expired. Please login again.");
  }

  // Rotate refresh token
  await db("refresh_tokens").where({ token_hash: tokenHash }).del();

  const tokens = await issueAuthTokens({
    id: stored.user_id,
    email: stored.email,
  });

  res.json({
    message: "Token refreshed successfully.",
    ...tokens,
  });
});

// Register
// Required fields: { name, email, phone, password }
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error("Please provide name, email, phone, and password.");
  }

  const existing = await db("users")
    .select("id")
    .where("email", email)
    .orWhere("phone", phone);

  if (existing.length > 0) {
    res.status(409);
    throw new Error("Email or phone number already registered.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = generateId();
  const walletId = generateId();

  await db.transaction(async (trx) => {
    await trx("users").insert({
      id: userId,
      name,
      email,
      phone,
      password: hashedPassword,
    });

    await trx("wallets").insert({
      id: walletId,
      user_id: userId,
      balance: 0,
    });
  });

  res.status(201).json({
    message: "Account created successfully! Your wallet is ready.",
    user: { id: userId, name, email, phone },
  });
});

// Login
// Required fields: { email, password }
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password.");
  }

  const user = await db<User>("users").where({ email }).first();

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  const tokens = await issueAuthTokens(user);

  res.json({
    message: "Login successful.",
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  });
});
