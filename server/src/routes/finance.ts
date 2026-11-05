import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const financeRouter = Router();

const createTransactionSchema = z.object({
  reference: z.string().trim().min(1).max(100),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().finite().positive().max(9_999_999_999.99).refine(
    (amount) => /^\d+(\.\d{1,2})?$/.test(String(amount)),
    "Amount must have at most two decimal places",
  ),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
  description: z.string().trim().max(500).optional(),
});

financeRouter.use(requireAuth, requireRole("SUPER_ADMIN", "ACCOUNTANT"));

financeRouter.get("/", async (_req, res, next) => {
  try {
    const [transactions, income, expenses] = await Promise.all([
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.transaction.aggregate({
        where: { status: "COMPLETED", type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { status: "COMPLETED", type: "EXPENSE" },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(income._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    res.json({
      transactions,
      summary: {
        totalRevenue,
        totalExpenses,
        netCashFlow: totalRevenue - totalExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

financeRouter.post("/", async (req, res, next) => {
  const parsed = createTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid transaction details", details: parsed.error.flatten() });
    return;
  }

  try {
    const transaction = await prisma.transaction.create({
      data: {
        ...parsed.data,
        status: parsed.data.status ?? "COMPLETED",
        description: parsed.data.description || null,
      },
    });
    res.status(201).json({ transaction });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      res.status(409).json({ error: "A transaction with this reference already exists" });
      return;
    }
    next(error);
  }
});
