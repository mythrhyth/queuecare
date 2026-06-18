import { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  status?: number;
}

export function errorMiddleware(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("API Error:", err.stack || err.message);

  const status = err.status || 500;
  const message = err.message || "An unexpected error occurred";

  res.status(status).json({
    message,
    status
  });
}
