import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import db from "../config/db";

const transactionSelect = [
  "t.id",
  "t.amount",
  "t.type",
  "t.description",
  "t.reference",
  "t.status",
  "t.created_at",
  db.raw("sender.name AS sender_name"),
  db.raw("sender.phone AS sender_phone"),
  db.raw("receiver.name AS receiver_name"),
  db.raw("receiver.phone AS receiver_phone"),
];

const buildTransactionQuery = (userId: string, type?: string) => {
  let query = db("transactions as t")
    .leftJoin("users as sender", "t.sender_id", "sender.id")
    .leftJoin("users as receiver", "t.receiver_id", "receiver.id");

  if (type === "credit") {
    query = query
      .where("t.receiver_id", userId)
      .andWhere("t.type", "credit");
  } else if (type === "debit") {
    query = query.where("t.sender_id", userId).andWhere("t.type", "debit");
  } else {
    query = query.where(function () {
      this.where("t.sender_id", userId).orWhere("t.receiver_id", userId);
    });
  }

  return query;
};

// Get Transaction History
// Required fields: { page, limit, type }
export const getTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;
    const type = req.query.type as string | undefined;

    const baseQuery = buildTransactionQuery(userId, type);

    const countResult = await baseQuery
      .clone()
      .count("* as total")
      .first<{ total: number }>();

    const total = Number(countResult?.total ?? 0);

    const rows = await baseQuery
      .clone()
      .select(transactionSelect)
      .orderBy("t.created_at", "desc")
      .limit(limit)
      .offset(offset);

    res.json({
      transactions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);
