import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "@prisma/client";
import { prisma } from "../db";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.erp_session;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      res.clearCookie("erp_session", { path: "/" });
      res.status(401).json({ error: "Account is unavailable" });
      return;
    }

    req.auth = {
      userId: user.id,
      role: user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
