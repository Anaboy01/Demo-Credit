import type { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

export const knexConfig: Knex.Config = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "demo_credit",
  },
  pool: {
    min: 0,
    max: 10,
  },
  migrations: {
    directory: "./src/db/migrations",
    extension: "ts",
  },
};
