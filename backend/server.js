import app from "./app.js";
import {
  closePool,
  getDatabaseHealth,
  pingDatabase,
  verifyDatabaseSchema,
} from "./config/db.js";
import { env } from "./config/env.js";
import { assertBaseSepoliaConnection } from "./services/web3Service.js";
import { logger } from "./utils/logger.js";

let isShuttingDown = false;

const logUnhandledError = (event, error) => {
  logger.error(event, {
    message: error?.message || String(error),
    stack: error?.stack,
  });
};

const registerProcessHandlers = (shutdown) => {
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("unhandledRejection", (reason) => {
    logUnhandledError("unhandled_rejection", reason);
  });

  process.on("uncaughtException", (error) => {
    logUnhandledError("uncaught_exception", error);
    void shutdown("uncaughtException", 1);
  });
};

const startServer = async () => {
  logger.info("backend_bootstrap_started", {
    environment: env.NODE_ENV,
    port: env.PORT,
    apiBaseUrl: env.PUBLIC_API_BASE_URL,
  });

  await pingDatabase();
  const [databaseHealth, rpcHealth] = await Promise.all([
    getDatabaseHealth(),
    assertBaseSepoliaConnection(),
    verifyDatabaseSchema(),
  ]);

  const server = app.listen(env.PORT, () => {
    logger.info("backend_started", {
      environment: env.NODE_ENV,
      serverUrl: `http://localhost:${env.PORT}`,
      port: env.PORT,
      database: databaseHealth.database,
      databaseTarget: databaseHealth.target,
      rpcUrl: rpcHealth.rpcUrl,
      chainId: rpcHealth.chainId,
      latestBlock: rpcHealth.blockNumber,
    });
  });

  const shutdown = async (signal, exitCode = 0) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info("shutdown_requested", { signal });

    server.close(async () => {
      await closePool();
      logger.info("backend_stopped", { signal });
      process.exit(exitCode);
    });
  };

  registerProcessHandlers(shutdown);
};

startServer().catch(async (error) => {
  logger.error("backend_start_failed", {
    message: error.message,
    stack: error.stack,
  });
  await closePool().catch(() => {});
  process.exit(1);
});
