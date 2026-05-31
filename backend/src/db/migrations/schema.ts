import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.string("id", 36).primary();
    table.string("name", 100).notNullable();
    table.string("email", 150).notNullable().unique();
    table.string("phone", 20).notNullable().unique();
    table.string("password", 255).notNullable();
    table
      .datetime("created_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP"))
      .notNullable();
  });

  await knex.schema.createTable("wallets", (table) => {
    table.string("id", 36).primary();
    table.string("user_id", 36).notNullable().unique();
    table.decimal("balance", 15, 2).notNullable().defaultTo(0);
    table
      .specificType(
        "updated_at",
        "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      )
      .notNullable();
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
  });

  await knex.schema.createTable("refresh_tokens", (table) => {
    table.string("id", 36).primary();
    table.string("user_id", 36).notNullable();
    table.string("token_hash", 64).notNullable().unique();
    table.datetime("expires_at").notNullable();
    table
      .datetime("created_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP"))
      .notNullable();
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.index("user_id", "idx_refresh_tokens_user");
  });

  await knex.schema.createTable("token_blacklist", (table) => {
    table.string("id", 36).primary();
    table.text("token").notNullable();
    table.string("user_id", 36).notNullable();
    table.datetime("expired_at").notNullable();
    table
      .datetime("created_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP"))
      .notNullable();
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
  });

  await knex.schema.createTable("transactions", (table) => {
    table.string("id", 36).primary();
    table.string("sender_id", 36).nullable();
    table.string("receiver_id", 36).notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.enum("type", ["credit", "debit"]).notNullable();
    table.string("description", 255);
    table.string("reference", 100).notNullable();
    table
      .enum("status", ["pending", "success", "failed"])
      .defaultTo("success");
    table
      .datetime("created_at")
      .defaultTo(knex.raw("CURRENT_TIMESTAMP"))
      .notNullable();
    table
      .foreign("sender_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .foreign("receiver_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.index("reference", "idx_transactions_reference");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("transactions");
  await knex.schema.dropTableIfExists("token_blacklist");
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("wallets");
  await knex.schema.dropTableIfExists("users");
}
