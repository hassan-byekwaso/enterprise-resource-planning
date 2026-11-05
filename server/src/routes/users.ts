import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const usersRouter = Router();

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes",
  ),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "ACCOUNTANT", "INVENTORY_MANAGER"]),
});

usersRouter.get("/", requireAuth, requireRole("SUPER_ADMIN"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req, res, next) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user details", details: parsed.error.flatten() });
    return;
  }

  try {
    const { name, email, password, role } = parsed.data;
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash: await bcrypt.hash(password, 12),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ user });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    next(error);
  }
});
