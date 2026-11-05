export interface ERPReportData {
  totalProducts: number;
  lowStockCount: number;
  totalValuation: number;
}

type ApiErrorResponse = { error?: string };

export class ReportServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ReportServiceError";
  }
}

export async function fetchERPReportData(): Promise<ERPReportData> {
  const response = await fetch("/api/reports", {
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new ReportServiceError(body.error ?? "Could not load report data", response.status);
  }

  const body = (await response.json()) as { report: ERPReportData };
  return body.report;
}
