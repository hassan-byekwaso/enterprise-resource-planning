import { useEffect, useState } from "react";
import { formatCurrency } from "../config/locale";
import { fetchERPReportData, type ERPReportData } from "../services/reportService";

export function ReportsView() {
  const [report, setReport] = useState<ERPReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchERPReportData()
      .then(setReport)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load report data");
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total Products",
      value: report ? String(report.totalProducts) : "—",
      note: "Products currently recorded",
      icon: "▦",
      tone: "blue",
    },
    {
      label: "Low Stock Alerts",
      value: report ? String(report.lowStockCount) : "—",
      note: "At or below minimum stock level",
      icon: "!",
      tone: "amber",
    },
    {
      label: "Total Valuation",
      value: report ? formatCurrency(report.totalValuation) : "—",
      note: "Current stock value",
      icon: "$",
      tone: "green",
    },
  ];

  return (
    <section className="inventory-page reports-page">
      <header className="inventory-page__header">
        <div>
          <p className="dashboard-eyebrow inventory-page__eyebrow">BUSINESS INSIGHTS</p>
          <h1>Reports</h1>
          <p>Review product levels and the current value of your inventory.</p>
        </div>
      </header>

      {error && <p className="users-alert" role="alert">{error}</p>}
      {loading && <p className="users-state" role="status">Loading report metrics…</p>}

      <div className="inventory-summary">
        {cards.map((card) => (
          <article className="summary-card inventory-summary-card" key={card.label}>
            <div className={`summary-card__icon summary-card__icon--${card.tone}`} aria-hidden="true">
              {card.icon}
            </div>
            <p>{card.label}</p>
            <strong>{loading ? "—" : card.value}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
