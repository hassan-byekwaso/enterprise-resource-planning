export type FinanceTransactionType = "INCOME" | "EXPENSE";
export type FinanceTransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface FinanceTransaction {
  id: string;
  reference: string;
  type: FinanceTransactionType;
  amount: string | number;
  status: FinanceTransactionStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netCashFlow: number;
}

export interface FinanceData {
  transactions: FinanceTransaction[];
  summary: FinanceSummary;
}

export interface CreateTransactionInput {
  reference: string;
  type: FinanceTransactionType;
  amount: number;
  status: FinanceTransactionStatus;
  description?: string;
}

type ApiErrorResponse = { error?: string };

export class FinanceServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "FinanceServiceError";
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
    throw new FinanceServiceError(body.error ?? "The request could not be completed", response.status);
  }

  return response.json() as Promise<T>;
}

export function fetchFinanceData(): Promise<FinanceData> {
  return request<FinanceData>("/api/finance");
}

export async function createTransaction(data: CreateTransactionInput): Promise<FinanceTransaction> {
  const response = await request<{ transaction: FinanceTransaction }>("/api/finance", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.transaction;
}
