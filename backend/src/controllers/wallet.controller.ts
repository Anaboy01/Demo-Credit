import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import db from "../config/db";
import { generateId, generateReference } from "../utils/helpers";
import {
  findEligibleBank,
  getEligibleBanks,
  isValidNuban,
} from "../services/bank.service";
import { Wallet } from "../types";

// Get Balance
// Required fields: { userId }
export const getBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const wallet = await db<Wallet>("wallets")
    .select("balance")
    .where({ user_id: userId })
    .first();

  if (!wallet) {
    res.status(404);
    throw new Error("Wallet not found.");
  }

  res.json({
    balance: Number(wallet.balance),
    formatted: `₦${Number(wallet.balance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
  });
});

// Fund Wallet (Top-up)
// Required fields: { amount }
// In a real application, this endpoint would be triggered by a payment processor (e.g. Paystack, Flutterwave) callback after a successful top-up.
// For simplicity and demonstration purposes, i am allowing wallet funding directly through this endpoint.
export const fundWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    res.status(400);
    throw new Error("Please provide a valid amount greater than ₦0.");
  }

  const fundAmount = Number(amount);
  const reference = generateReference();
  const txnId = generateId();

  await db.transaction(async (trx) => {
    await trx("wallets")
      .where({ user_id: userId })
      .increment("balance", fundAmount);

    await trx("transactions").insert({
      id: txnId,
      sender_id: null,
      receiver_id: userId,
      amount: fundAmount,
      type: "credit",
      description: "Wallet top-up",
      reference,
    });
  });

  res.status(201).json({
    message: `Wallet funded successfully with ₦${fundAmount.toLocaleString()}.`,
    reference,
  });
});

// Send Money
// Required fields: { recipientPhone, amount, description? }
export const sendMoney = asyncHandler(async (req: Request, res: Response) => {
  const senderId = req.user!.userId;
  const { recipientPhone, amount, description } = req.body;

  if (!recipientPhone || !amount || isNaN(amount) || Number(amount) <= 0) {
    res.status(400);
    throw new Error("Please provide a valid recipient phone and amount.");
  }

  const sendAmount = Number(amount);

  const sender = await db("users")
    .select("phone")
    .where({ id: senderId })
    .first();

  if (sender?.phone === recipientPhone) {
    res.status(400);
    throw new Error("You cannot send money to yourself.");
  }

  const recipient = await db("users")
    .select("id", "name")
    .where({ phone: recipientPhone })
    .first();

  if (!recipient) {
    res.status(404);
    throw new Error(`No account found with phone number ${recipientPhone}.`);
  }

  const reference = generateReference();
  const debitTxnId = generateId();
  const creditTxnId = generateId();

  await db.transaction(async (trx) => {
    const senderWallet = await trx<Wallet>("wallets")
      .select("balance")
      .where({ user_id: senderId })
      .forUpdate()
      .first();

    if (!senderWallet || Number(senderWallet.balance) < sendAmount) {
      res.status(400);
      throw new Error(
        `Insufficient balance. Your balance is ₦${Number(senderWallet?.balance || 0).toLocaleString()}.`
      );
    }

    await trx("wallets")
      .where({ user_id: senderId })
      .decrement("balance", sendAmount);

    await trx("wallets")
      .where({ user_id: recipient.id })
      .increment("balance", sendAmount);

    await trx("transactions").insert({
      id: debitTxnId,
      sender_id: senderId,
      receiver_id: recipient.id,
      amount: sendAmount,
      type: "debit",
      description:
        description || `Transfer to ${recipient.name}`,
      reference,
    });

    await trx("transactions").insert({
      id: creditTxnId,
      sender_id: senderId,
      receiver_id: recipient.id,
      amount: sendAmount,
      type: "credit",
      description:
        description || `Transfer from ${sender!.phone}`,
      reference,
    });
  });

  res.status(201).json({
    message: `₦${sendAmount.toLocaleString()} sent to ${recipient.name} successfully.`,
    reference,
  });
});

// List banks eligible for withdrawal
// GET /api/wallet/banks
export const listEligibleBanks = asyncHandler(
  async (_req: Request, res: Response) => {
    const banks = await getEligibleBanks();
    res.json({ banks });
  }
);

// Withdraw Funds
// Required fields: { amount, bankCode, accountNumber }
// Optional fields: { description? }
// bankCode accepts the bank code, slug (e.g. "opay"), or name (e.g. "UBA").
export const withdrawFunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { amount, bankCode, accountNumber, description } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    res.status(400);
    throw new Error("Please provide a valid amount greater than ₦0.");
  }

  if (!bankCode) {
    res.status(400);
    throw new Error("Please provide a bank code.");
  }

  if (!accountNumber) {
    res.status(400);
    throw new Error("Please provide an account number.");
  }

  if (!isValidNuban(accountNumber)) {
    res.status(400);
    throw new Error("Account number must be a valid 10-digit NUBAN.");
  }

  const bank = await findEligibleBank(bankCode);
  if (!bank) {
    const eligible = (await getEligibleBanks()).map((b) => b.name).join(", ");
    res.status(400);
    throw new Error(
      `Bank not eligible for withdrawal. Supported banks: ${eligible}.`
    );
  }

  const withdrawAmount = Number(amount);
  const reference = generateReference();
  const txnId = generateId();

  let newBalance = 0;

  await db.transaction(async (trx) => {
    const wallet = await trx<Wallet>("wallets")
      .select("balance")
      .where({ user_id: userId })
      .forUpdate()
      .first();

    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found.");
    }

    if (Number(wallet.balance) < withdrawAmount) {
      res.status(400);
      throw new Error(
        `Insufficient balance. Your balance is ₦${Number(wallet.balance).toLocaleString()}.`
      );
    }

    await trx("wallets")
      .where({ user_id: userId })
      .decrement("balance", withdrawAmount);

    await trx("transactions").insert({
      id: txnId,
      sender_id: userId,
      receiver_id: userId,
      amount: withdrawAmount,
      type: "debit",
      description:
        description ||
        `Withdrawal to ${bank.name} (${accountNumber.trim()})`,
      reference,
    });

    newBalance = Number(wallet.balance) - withdrawAmount;
  });

  res.status(201).json({
    message: `₦${withdrawAmount.toLocaleString()} withdrawn to ${bank.name} successfully.`,
    reference,
    balance: newBalance,
    bank: {
      code: bank.code,
      name: bank.name,
    },
    accountNumber: accountNumber.trim(),
  });
});
