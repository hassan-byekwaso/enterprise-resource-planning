export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: string | number;
  stockQuantity: number;
  minStockLevel: number;
  categoryId: string | null;
  category: Pick<Category, "id" | "name"> | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reference: string | null;
  createdAt: string;
  product: Pick<Product, "id" | "name" | "sku">;
  user: { id: string; name: string };
}

export interface ProductInput {
  name: string;
  sku: string;
  price: number;
  minStockLevel: number;
  categoryId: string | null;
}

export interface CreateProductInput extends ProductInput {
  initialStock: number;
}

export interface CategoryInput {
  name: string;
  description?: string;
}

export interface StockMovementInput {
  productId: string;
  type: StockMovementType;
  quantity: number;
  reference?: string;
}

type ApiErrorResponse = { error?: string };

export class InventoryServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "InventoryServiceError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new InventoryServiceError(body.error ?? "The request could not be completed", response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await request<{ products: Product[] }>("/api/products");
  return response.products;
}

export async function fetchLowStockProducts(): Promise<Product[]> {
  const response = await request<{ products: Product[] }>("/api/products/low-stock");
  return response.products;
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await request<{ categories: Category[] }>("/api/categories");
  return response.categories;
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  const response = await request<{ movements: StockMovement[] }>("/api/stock-movements");
  return response.movements;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const response = await request<{ category: Category }>("/api/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.category;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const response = await request<{ product: Product }>("/api/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const response = await request<{ product: Product }>(`/api/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.product;
}

export async function deleteProduct(id: string): Promise<void> {
  await request<void>(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createStockMovement(input: StockMovementInput): Promise<StockMovement> {
  const response = await request<{ movement: StockMovement }>("/api/stock-movements", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.movement;
}
