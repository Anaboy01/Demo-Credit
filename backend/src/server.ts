import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { testConnection } from "./config/db";

const PORT = process.env.PORT || 5500;

const start = async () => {
  try {
    console.log("1. App starting");

    await testConnection();
    console.log("2. Database connected");

    app.listen(PORT, () => {
      console.log(`3. Server listening on ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
  }
};

start();