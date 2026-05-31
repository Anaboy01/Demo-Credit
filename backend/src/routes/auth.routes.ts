import { Router } from "express";
import { register, login, logout, refresh } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/refresh
router.post("/refresh", refresh);

// POST /api/auth/logout  (requires valid token)
router.post("/logout", protect, logout);
export default router;