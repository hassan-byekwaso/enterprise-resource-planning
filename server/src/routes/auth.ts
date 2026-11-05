import { Router } from "express";
import type { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes",
  ),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(120),
});

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 1000,
};

function setSessionCookie(res: Response, user: { id: string }) {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: "1h",
  });
  res.cookie("erp_session", token, cookieOptions);
}

authRouter.post("/register", async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration details", details: parsed.error.flatten() });
    return;
  }

  try {
    const { email, name, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: { id: true, name: true, email: true, role: true },
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      throw error;
    }
    setSessionCookie(res, user);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    setSessionCookie(res, user);
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("erp_session", { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      res.clearCookie("erp_session", { ...cookieOptions, maxAge: undefined });
      res.status(401).json({ error: "Account is unavailable" });
      return;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});
