import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  msg: string;
  level: LogLevel;
  time: string;
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  err?: { message: string; stack?: string };
  [key: string]: unknown;
}

function emit(fields: LogFields): void {
  console.log(JSON.stringify(fields));
}

export const logger = {
  debug(msg: string, extra?: Record<string, unknown>): void {
    emit({ level: "debug", time: new Date().toISOString(), msg, ...extra });
  },
  info(msg: string, extra?: Record<string, unknown>): void {
    emit({ level: "info", time: new Date().toISOString(), msg, ...extra });
  },
  warn(msg: string, extra?: Record<string, unknown>): void {
    emit({ level: "warn", time: new Date().toISOString(), msg, ...extra });
  },
  error(msg: string, extra?: Record<string, unknown>): void {
    emit({ level: "error", time: new Date().toISOString(), msg, ...extra });
  },
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  req.requestId = requestId;
  const start = Date.now();

  res.on("finish", () => {
    logger.info("request", {
      requestId,
      userId: req.userId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}

export function errorLoggingMiddleware(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  logger.error("unhandled_error", {
    requestId: req.requestId,
    userId: req.userId,
    method: req.method,
    path: req.originalUrl,
    err: { message: err.message, stack: err.stack },
  });
  next(err);
}
