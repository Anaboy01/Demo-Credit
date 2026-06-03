import express from "express";
import authRoutes from "./routes/auth.routes";
import walletRoutes from "./routes/wallet.routes";
import transactionRoutes from "./routes/transaction.routes";
import internalRoutes from "./routes/internal.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Demo Credit API is running 🟢" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/internal", internalRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});


app.use(errorHandler);

export default app;