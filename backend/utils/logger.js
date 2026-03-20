const log = (level, message, meta = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  const output = JSON.stringify(payload);

  if (level === "error") {
    console.error(output);
    return;
  }

  console.log(output);
};

const logger = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};

export { logger };
