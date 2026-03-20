import { HttpError } from "../utils/httpError.js";

const notFoundHandler = (_req, _res, next) => {
  next(new HttpError(404, "Route not found.", { code: "ROUTE_NOT_FOUND" }));
};

export { notFoundHandler };
