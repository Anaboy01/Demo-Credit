import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import db from "../config/db";

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await db("users")
    .select("id", "name", "email", "phone", "created_at")
    .orderBy("created_at", "desc");

  res.json({ users, total: users.length });
});

export const getAllWallets = asyncHandler(
  async (_req: Request, res: Response) => {
    const wallets = await db("wallets as w")
      .join("users as u", "w.user_id", "u.id")
      .select(
        "w.id",
        "w.user_id",
        "u.name as user_name",
        "u.email as user_email",
        "u.phone as user_phone",
        "w.balance",
        "w.updated_at"
      )
      .orderBy("w.updated_at", "desc");

    res.json({ wallets, total: wallets.length });
  }
);

export const getAllTransactions = asyncHandler(
  async (_req: Request, res: Response) => {
    const transactions = await db("transactions as t")
      .leftJoin("users as sender", "t.sender_id", "sender.id")
      .leftJoin("users as receiver", "t.receiver_id", "receiver.id")
      .select(
        "t.id",
        "t.amount",
        "t.type",
        "t.description",
        "t.reference",
        "t.status",
        "t.created_at",
        "t.sender_id",
        "t.receiver_id",
        db.raw("sender.name AS sender_name"),
        db.raw("sender.phone AS sender_phone"),
        db.raw("receiver.name AS receiver_name"),
        db.raw("receiver.phone AS receiver_phone")
      )
      .orderBy("t.created_at", "desc");

    res.json({ transactions, total: transactions.length });
  }
);
