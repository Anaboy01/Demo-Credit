import db from "../src/config/db";

const TABLES = [
  "transactions",
  "token_blacklist",
  "refresh_tokens",
  "wallets",
  "users",
  "knex_migrations",
  "knex_migrations_lock",
];

async function resetDatabase(): Promise<void> {
  console.log("Dropping existing tables...");

  await db.raw("SET FOREIGN_KEY_CHECKS = 0");

  for (const table of TABLES) {
    await db.schema.dropTableIfExists(table);
    console.log(`  dropped ${table}`);
  }

  await db.raw("SET FOREIGN_KEY_CHECKS = 1");

  console.log("Running Knex migrations...");
  await db.migrate.latest();

  console.log("Database reset complete.");
}

resetDatabase()
  .catch((error) => {
    console.error("Database reset failed:", error);
    process.exit(1);
  })
  .finally(() => db.destroy());
