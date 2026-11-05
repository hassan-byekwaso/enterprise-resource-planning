import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireTrustedOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (safeMethods.has(req.method)) {
    next();
    return;
  }
  if (req.get("origin") !== env.CLIENT_ORIGIN) {
    res.status(403).json({ error: "Untrusted request origin" });
    return;
  }
  next();
}
