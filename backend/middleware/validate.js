import { ZodError } from "zod";

import { HttpError } from "../utils/httpError.js";

const buildErrorDetails = (error) =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

const applyParsedValue = (req, key, parsedValue) => {
  const currentValue = req[key];

  if (
    currentValue &&
    parsedValue &&
    typeof currentValue === "object" &&
    typeof parsedValue === "object" &&
    !Array.isArray(currentValue) &&
    !Array.isArray(parsedValue)
  ) {
    for (const existingKey of Object.keys(currentValue)) {
      delete currentValue[existingKey];
    }

    Object.assign(currentValue, parsedValue);
    return;
  }

  req[key] = parsedValue;
};

const validate =
  ({ body, params, query }) =>
  (req, _res, next) => {
    try {
      if (body) {
        applyParsedValue(req, "body", body.parse(req.body));
      }

      if (params) {
        applyParsedValue(req, "params", params.parse(req.params));
      }

      if (query) {
        applyParsedValue(req, "query", query.parse(req.query));
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new HttpError(400, "Request validation failed.", {
            code: "VALIDATION_ERROR",
            details: buildErrorDetails(error),
          }),
        );
        return;
      }

      next(error);
    }
  };

export { validate };
