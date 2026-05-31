import knex from "knex";
import { knexConfig } from "./database";

const db = knex(knexConfig);

export const testConnection = async (): Promise<void> => {
  try {
    await db.raw("SELECT 1");
    console.log("✅ MySQL connected successfully");
  } catch (error) {
    console.error("❌ MySQL connection failed:", error);
    process.exit(1);
  }
};

export default db;
