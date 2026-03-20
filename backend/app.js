import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { getDatabaseHealth } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import compatibilityRoutes from "./routes/compatibility.js";
import nftRoutes from "./routes/nft.js";
import paymentRoutes from "./routes/payment.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(
  cors({
    origin:
      env.FRONTEND_ORIGIN === "*"
        ? true
        : env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info("http_request", { message: message.trim() }),
    },
  }),
);

app.get("/health", async (_req, res) => {
  try {
    const database = await getDatabaseHealth();

    res.status(200).json({
      status: "ok",
      database: database.database,
      timestamp: database.timestamp,
    });
  } catch (error) {
    logger.error("health_check_failed", {
      message: error.message,
      code: error.code,
    });

    res.status(503).json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/", compatibilityRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/nfts", nftRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
