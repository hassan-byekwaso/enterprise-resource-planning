import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

export const reportsRouter = Router();

type ReportRow = {
  totalProducts: bigint;
  lowStockCount: bigint;
  totalValuation: Prisma.Decimal;
};

reportsRouter.get("/reports", requireAuth, async (_req, res, next) => {
  try {
    const [report] = await prisma.$queryRaw<ReportRow[]>`
      SELECT
        COUNT(*) AS "totalProducts",
        COUNT(*) FILTER (WHERE stock_quantity <= min_stock_level) AS "lowStockCount",
        COALESCE(SUM(price * stock_quantity), 0) AS "totalValuation"
      FROM products
    `;

    res.json({
      report: {
        totalProducts: Number(report.totalProducts),
        lowStockCount: Number(report.lowStockCount),
        totalValuation: Number(report.totalValuation),
      },
    });
  } catch (error) {
    next(error);
  }
});
