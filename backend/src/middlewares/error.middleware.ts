import { Request, Response, NextFunction } from "express";


export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("🔴 Error:", err.message);

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
  
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};