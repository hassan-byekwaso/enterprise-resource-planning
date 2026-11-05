import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatCurrency } from "../config/locale";
import {
  createTransaction,
  fetchFinanceData,
  type FinanceData,
  type FinanceTransaction,
  type FinanceTransactionStatus,
  type FinanceTransactionType,
} from "../services/financeService";

type TransactionFilter = "ALL" | FinanceTransactionType;

export function FinanceView() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<TransactionFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FinanceTransactionStatus>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoadError("");
    try {
      setData(await fetchFinanceData());
    } catch (cause) {
      setLoadError(getErrorMessage(cause, "Could not load finance data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const visibleTransactions = useMemo(
    () => (data?.transactions ?? []).filter((transaction) =>
      (filter === "ALL" || transaction.type === filter)
      && (statusFilter === "ALL" || transaction.status === statusFilter)),
    [data, filter, statusFilter],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amount = Number(values.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9_999_999_999.99) {
      setActionError("Enter a positive amount within the supported limit.");
      return;
    }

    setSaving(true);
    setActionError("");
    try {
      await createTransaction({
        reference: String(values.get("reference") ?? "").trim(),
        type: String(values.get("type")) as FinanceTransactionType,
        amount,
        status: String(values.get("status")) as FinanceTransactionStatus,
        description: String(values.get("description") ?? "").trim() || undefined,
      });
      setModalOpen(false);
      await loadData();
    } catch (cause) {
      setActionError(getErrorMessage(cause, "Could not record transaction"));
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setActionError("");
  }

  return (
    <section className="inventory-page finance-page">
      <header className="inventory-page__header">
        <div>
          <p className="dashboard-eyebrow inventory-page__eyebrow">CASH MANAGEMENT</p>
          <h1>Finance</h1>
          <p>Track recorded income, expenses, and your net cash flow.</p>
        </div>
        <button className="inventory-button" onClick={() => { setActionError(""); setModalOpen(true); }}>
          + Record transaction
        </button>
      </header>

      {loadError && <p className="users-alert" role="alert">{loadError}</p>}

      <div className="inventory-summary">
        <SummaryCard label="Total Revenue" value={data ? formatCurrency(data.summary.totalRevenue) : "—"} tone="green" />
        <SummaryCard label="Total Expenses" value={data ? formatCurrency(data.summary.totalExpenses) : "—"} tone="amber" />
        <SummaryCard label="Net Cash Flow" value={data ? formatCurrency(data.summary.netCashFlow) : "—"} tone="blue" />
      </div>

      <section className="inventory-panel">
        <div className="inventory-panel__heading finance-panel__heading">
          <div>
            <h2>Transactions</h2>
            <p>Most recent 200 entries · summaries include completed transactions only</p>
          </div>
          <div className="finance-filters">
            <label>
              <span className="sr-only">Filter by transaction type</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as TransactionFilter)}>
                <option value="ALL">All types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by transaction status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | FinanceTransactionStatus)}>
                <option value="ALL">All statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="users-state" role="status">Loading transactions…</div>
        ) : visibleTransactions.length === 0 && !loadError ? (
          <div className="users-state"><strong>No transactions found</strong><span>Record an entry or adjust the filters.</span></div>
        ) : (
          <div className="users-table-scroll">
            <table className="users-table finance-table">
              <thead>
                <tr>
                  <th scope="col">Reference</th><th scope="col">Description</th><th scope="col">Type</th>
                  <th scope="col">Status</th><th scope="col">Amount</th><th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="user-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <section className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title">
            <header className="user-dialog__header">
              <div>
                <span className="user-dialog__icon" aria-hidden="true">$</span>
                <div>
                  <h2 id="finance-dialog-title">Record transaction</h2>
                  <p>Add an income or expense entry to your finance ledger.</p>
                </div>
              </div>
              <button type="button" className="user-dialog__close" aria-label="Close dialog" disabled={saving} onClick={closeModal}>×</button>
            </header>

            <form className="user-form" onSubmit={(event) => void handleSubmit(event)}>
              <label>Reference<input name="reference" required maxLength={100} /></label>
              <label>Transaction type
                <select name="type" defaultValue="INCOME">
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </label>
              <label>Amount<input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label>
              <label>Status
                <select name="status" defaultValue="COMPLETED">
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                </select>
              </label>
              <label>Description <span className="field-hint">(optional)</span><input name="description" maxLength={500} /></label>
              {actionError && <p className="error-message" role="alert">{actionError}</p>}
              <div className="user-form__actions">
                <button type="button" className="user-cancel-button" disabled={saving} onClick={closeModal}>Cancel</button>
                <button type="submit" className="users-create-button" disabled={saving}>{saving ? "Saving…" : "Save transaction"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  const icons = { green: "$", amber: "−", blue: "=" };
  return (
    <article className="summary-card inventory-summary-card">
      <div className={`summary-card__icon summary-card__icon--${tone}`} aria-hidden="true">{icons[tone as keyof typeof icons]}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>Completed transactions</span>
    </article>
  );
}

function TransactionRow({ transaction }: { transaction: FinanceTransaction }) {
  return (
    <tr>
      <td><strong className="inventory-product-name">{transaction.reference}</strong></td>
      <td>{transaction.description || "—"}</td>
      <td><span className={`finance-type finance-type--${transaction.type.toLowerCase()}`}>{transaction.type}</span></td>
      <td><span className={`finance-status finance-status--${transaction.status.toLowerCase()}`}>{transaction.status}</span></td>
      <td className="finance-amount">{transaction.type === "EXPENSE" ? "−" : "+"}{formatCurrency(Number(transaction.amount))}</td>
      <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
    </tr>
  );
}

function getErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
