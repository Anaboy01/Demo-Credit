import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthPayload } from "../types";
import db from "../config/db";

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided. Please login." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as AuthPayload;

    const blacklisted = await db("token_blacklist")
      .select("id")
      .where({ token })
      .first();

    if (blacklisted) {
      res
        .status(401)
        .json({ message: "Token has been invalidated. Please login again." });
      return;
    }

    req.user = decoded;
    next();
  } catch {
    res
      .status(401)
      .json({ message: "Invalid or expired token. Please login again." });
  }
};
