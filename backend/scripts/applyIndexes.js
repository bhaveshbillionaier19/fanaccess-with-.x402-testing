import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { closePool, pingDatabase, query, verifyDatabaseSchema } from "../config/db.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexesPath = path.resolve(__dirname, "../db/indexes.sql");

const run = async () => {
  await pingDatabase();

  const sql = await fs.readFile(indexesPath, "utf8");
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await query(statement);
  }

  await verifyDatabaseSchema();

  logger.info("db_indexes_applied", {
    file: indexesPath,
    statementsApplied: statements.length,
  });
};

run()
  .catch(async (error) => {
    logger.error("db_indexes_apply_failed", {
      message: error.message,
      code: error.code,
    });
    process.exitCode = 1;
    await closePool().catch(() => {});
  })
  .finally(async () => {
    await closePool().catch(() => {});
  });
