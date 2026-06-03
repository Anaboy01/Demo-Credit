import { Router } from "express";
import {
  getAllUsers,
  getAllWallets,
  getAllTransactions,
} from "../controllers/internal.controller";

const router = Router();

router.get("/users", getAllUsers);
router.get("/wallets", getAllWallets);
router.get("/transactions", getAllTransactions);

export default router;
