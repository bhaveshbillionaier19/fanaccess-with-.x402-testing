import { HttpError } from "../utils/httpError.js";
import { logger } from "../utils/logger.js";

const errorHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const code =
    error instanceof HttpError && error.code
      ? error.code
      : "INTERNAL_SERVER_ERROR";

  logger.error(error.message || "Unhandled error.", {
    code,
    statusCode,
    stack: error.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message:
        statusCode === 500 ? "Internal server error." : error.message,
      details: error instanceof HttpError ? error.details : undefined,
    },
  });
};

export { errorHandler };
