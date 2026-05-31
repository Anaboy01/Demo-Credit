import { Router } from "express";
import { getTransactions } from "../controllers/transaction.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// Protecting the transaction routes
router.use(protect);

// GET /api/transactions?page=1&limit=10&type=credit
router.get("/", getTransactions);

export default router;