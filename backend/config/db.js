import pg from "pg";
import { performance } from "node:perf_hooks";

import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const { Pool } = pg;
const DB_POOL_SINGLETON_KEY = "__FAN_ACCESS_PG_POOL__";
const DB_POOL_EVENTS_KEY = "__FAN_ACCESS_PG_POOL_EVENTS_ATTACHED__";
const REQUIRED_TABLES = ["users", "nfts", "payments", "access"];
const REQUIRED_INDEXES = [
  {
    target: "users(wallet_address)",
    names: ["idx_users_wallet_address", "users_wallet_address_key"],
  },
  {
    target: "access(user_id,nft_id)",
    names: ["idx_access_user_id_nft_id", "access_user_id_nft_id_key"],
  },
  {
    target: "payments(tx_hash)",
    names: ["idx_payments_tx_hash", "payments_tx_hash_key"],
  },
];

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    };

const formatStatement = (text) => text.replace(/\s+/g, " ").trim();

const connectionTarget = env.DATABASE_URL
  ? (() => {
      const url = new URL(env.DATABASE_URL);
      return `${url.hostname}:${url.port || "5432"}/${url.pathname.replace(/^\//, "")}`;
    })()
  : `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

const globalForPool = globalThis;

const pool =
  globalForPool[DB_POOL_SINGLETON_KEY] ||
  new Pool({
    ...poolConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

globalForPool[DB_POOL_SINGLETON_KEY] = pool;

if (!globalForPool[DB_POOL_EVENTS_KEY]) {
  pool.on("error", (error) => {
    logger.error("db_idle_client_error", {
      message: error.message,
      code: error.code,
    });
  });

  globalForPool[DB_POOL_EVENTS_KEY] = true;
}

const executeQuery = async (executor, text, params = []) => {
  const statement = formatStatement(text);
  const startedAt = performance.now();

  try {
    const result = await executor.query(text, params);

    if (env.DB_DEBUG) {
      logger.info("db_query", {
        statement,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        rowCount: result.rowCount ?? 0,
        paramCount: params.length,
      });
    }

    return result;
  } catch (error) {
    logger.error("db_query_failed", {
      statement,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      paramCount: params.length,
      message: error.message,
      code: error.code,
    });
    throw error;
  }
};

const query = (text, params) => executeQuery(pool, text, params);

const getClient = async () => {
  try {
    return await pool.connect();
  } catch (error) {
    logger.error("db_connect_failed", {
      target: connectionTarget,
      message: error.message,
      code: error.code,
    });
    throw error;
  }
};

const withTransaction = async (callback) => {
  const client = await getClient();

  try {
    if (env.DB_DEBUG) {
      logger.info("db_transaction_begin", { target: connectionTarget });
    }
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    if (env.DB_DEBUG) {
      logger.info("db_transaction_commit", { target: connectionTarget });
    }
    return result;
  } catch (error) {
    logger.error("db_transaction_failed", {
      message: error.message,
      code: error.code,
    });
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logger.error("db_rollback_failed", {
        message: rollbackError.message,
        code: rollbackError.code,
      });
    }
    throw error;
  } finally {
    client.release();
  }
};

const pingDatabase = async () => {
  try {
    await query("SELECT 1");
    logger.info("db_connection_ready", {
      target: connectionTarget,
    });
  } catch (error) {
    logger.error("db_connection_check_failed", {
      target: connectionTarget,
      message: error.message,
      code: error.code,
    });
    throw error;
  }
};

const getDatabaseHealth = async () => {
  const result = await query("SELECT NOW() AS now");

  return {
    database: "connected",
    timestamp: result.rows[0]?.now ?? new Date().toISOString(),
    target: connectionTarget,
  };
};

const verifyDatabaseSchema = async () => {
  const tableResult = await query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])
    `,
    [REQUIRED_TABLES],
  );

  const presentTables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter((table) => !presentTables.has(table));

  if (missingTables.length > 0) {
    logger.error("db_schema_missing_tables", {
      missingTables,
    });
    throw new Error(
      `Missing required database tables: ${missingTables.join(", ")}.`,
    );
  }

  logger.info("db_schema_ready", {
    tables: REQUIRED_TABLES,
  });

  const acceptableIndexNames = REQUIRED_INDEXES.flatMap((index) => index.names);
  const indexResult = await query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = ANY($1::text[])
    `,
    [acceptableIndexNames],
  );

  const presentIndexes = new Set(indexResult.rows.map((row) => row.indexname));
  const missingIndexes = REQUIRED_INDEXES
    .filter((index) => !index.names.some((name) => presentIndexes.has(name)))
    .map((index) => index.target);

  if (missingIndexes.length > 0) {
    logger.warn("db_schema_missing_indexes", {
      missingIndexes,
      hint: "Run `npm run db:indexes` in backend/ after the database is available.",
    });
    return;
  }

  logger.info("db_indexes_ready", {
    indexes: REQUIRED_INDEXES.map((index) => index.target),
  });
};

const closePool = async () => {
  await pool.end();
};

export {
  closePool,
  executeQuery,
  getDatabaseHealth,
  getClient,
  pingDatabase,
  pool,
  query,
  verifyDatabaseSchema,
  withTransaction,
};
