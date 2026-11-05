import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export const inventoryRouter = Router();

const inventoryAccess = requireRole("SUPER_ADMIN", "MANAGER", "INVENTORY_MANAGER");
const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().transform((value) => value || null),
}).strict();
const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(64).transform((value) => value.toUpperCase()),
  price: z.number().finite().min(0).max(9999999999.99),
  minStockLevel: z.number().int().min(0).max(2147483647),
  categoryId: z.string().uuid().nullable(),
}).strict();
const createProductSchema = productSchema.extend({
  initialStock: z.number().int().min(0).max(2147483647),
});
const stockMovementSchema = z.union([
  z.object({
    type: z.literal("IN"),
    quantity: z.number().int().positive().max(2147483647),
    productId: z.string().uuid(),
    reference: z.string().trim().max(200).optional().transform((value) => value || null),
  }).strict(),
  z.object({
    type: z.literal("OUT"),
    quantity: z.number().int().positive().max(2147483647),
    productId: z.string().uuid(),
    reference: z.string().trim().max(200).optional().transform((value) => value || null),
  }).strict(),
  z.object({
    type: z.literal("ADJUSTMENT"),
    quantity: z.number().int().min(-2147483647).max(2147483647)
      .refine((value) => value !== 0, "Adjustment must not be zero"),
    productId: z.string().uuid(),
    reference: z.string().trim().max(200).optional().transform((value) => value || null),
  }).strict(),
]);

const productSelect = {
  id: true,
  name: true,
  sku: true,
  price: true,
  stockQuantity: true,
  minStockLevel: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

inventoryRouter.use(["/categories", "/products", "/stock-movements"], requireAuth, inventoryAccess);

inventoryRouter.get("/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post("/categories", async (req, res, next) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category details", details: parsed.error.flatten() });
    return;
  }
  try {
    const category = await prisma.category.create({ data: parsed.data });
    res.status(201).json({ category });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      res.status(409).json({ error: "A category with this name already exists" });
      return;
    }
    next(error);
  }
});

inventoryRouter.get("/products/low-stock", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      select: productSelect,
      orderBy: { stockQuantity: "asc" },
    });
    res.json({ products: products.filter((product) => product.stockQuantity <= product.minStockLevel) });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get("/products", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      select: productSelect,
      orderBy: { name: "asc" },
    });
    const result = req.query.lowStock === "true"
      ? products.filter((product) => product.stockQuantity <= product.minStockLevel)
      : products;
    res.json({ products: result });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post("/products", async (req, res, next) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product details", details: parsed.error.flatten() });
    return;
  }
  try {
    const { initialStock, ...data } = parsed.data;
    const product = await prisma.$transaction(async (transaction) => {
      const created = await transaction.product.create({ data: { ...data, stockQuantity: initialStock } });
      if (initialStock > 0) {
        await transaction.stockMovement.create({
          data: {
            productId: created.id,
            type: "IN",
            quantity: initialStock,
            reference: "Initial stock",
            userId: req.auth!.userId,
          },
        });
      }
      return transaction.product.findUniqueOrThrow({ where: { id: created.id }, select: productSelect });
    });
    res.status(201).json({ product });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      res.status(409).json({ error: "A product with this SKU already exists" });
      return;
    }
    if (isPrismaError(error, "P2003")) {
      res.status(400).json({ error: "The selected category does not exist" });
      return;
    }
    next(error);
  }
});

inventoryRouter.patch("/products/:id", async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }
  const parsed = productSchema.partial().strict().safeParse(req.body);
  if (!parsed.success || Object.keys(req.body as object).length === 0) {
    res.status(400).json({ error: "Invalid product details", details: parsed.success ? undefined : parsed.error.flatten() });
    return;
  }
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: parsed.data,
      select: productSelect,
    });
    res.json({ product });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      res.status(409).json({ error: "A product with this SKU already exists" });
      return;
    }
    if (isPrismaError(error, "P2003")) {
      res.status(400).json({ error: "The selected category does not exist" });
      return;
    }
    if (isPrismaError(error, "P2025")) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    next(error);
  }
});

inventoryRouter.delete("/products/:id", async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (isPrismaError(error, "P2003")) {
      res.status(409).json({ error: "Products with stock movement history cannot be deleted" });
      return;
    }
    next(error);
  }
});

inventoryRouter.get("/stock-movements", async (_req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true } },
      },
    });
    res.json({ movements });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post("/stock-movements", async (req, res, next) => {
  const parsed = stockMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid stock movement", details: parsed.error.flatten() });
    return;
  }
  const { productId, type, quantity, reference } = parsed.data;
  const delta = type === "OUT" ? -quantity : quantity;

  try {
    const movement = await prisma.$transaction(async (transaction) => {
      const update = delta > 0
        ? await transaction.product.updateMany({
          where: { id: productId, stockQuantity: { lte: 2147483647 - delta } },
          data: { stockQuantity: { increment: delta } },
        })
        : await transaction.product.updateMany({
          where: { id: productId, stockQuantity: { gte: Math.abs(delta) } },
          data: { stockQuantity: { decrement: Math.abs(delta) } },
        });

      if (update.count === 0) {
        const existing = await transaction.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!existing) throw new InventoryRequestError(404, "Product not found");
        throw new InventoryRequestError(
          409,
          delta > 0 ? "Stock quantity exceeds the supported maximum" : "Stock cannot be reduced below zero",
        );
      }

      return transaction.stockMovement.create({
        data: { productId, type, quantity, reference, userId: req.auth!.userId },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true } },
        },
      });
    });
    res.status(201).json({ movement });
  } catch (error) {
    if (error instanceof InventoryRequestError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    next(error);
  }
});

function isPrismaError(error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

class InventoryRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
