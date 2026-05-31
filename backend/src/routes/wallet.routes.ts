import { Router } from "express";
import {
  getBalance,
  fundWallet,
  listEligibleBanks,
  sendMoney,
  withdrawFunds,
} from "../controllers/wallet.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// Protecting the wallet routes
router.use(protect);

// GET  /api/wallet/balance
router.get("/balance", getBalance);

// POST /api/wallet/fund
router.post("/fund", fundWallet);

// POST /api/wallet/send
router.post("/send", sendMoney);

// GET  /api/wallet/banks
router.get("/banks", listEligibleBanks);

// POST /api/wallet/withdraw
router.post("/withdraw", withdrawFunds);

export default router;