import { useEffect, useState, type FormEvent } from "react";
import { DashboardView } from "./DashboardView";
import { FinanceView } from "./components/FinanceView";
import { InventoryView } from "./components/InventoryView";
import { ReportsView } from "./components/ReportsView";
import { UserManagementView } from "./UserManagementView";
import { WorkspaceLayout, type WorkspacePage } from "./WorkspaceLayout";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ApiError = {
  error?: string;
};

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
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
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new ApiRequestError(body.error ?? "The request could not be completed", response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    request<{ user: User }>("/api/auth/me")
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((cause: unknown) => {
        if (cause instanceof ApiRequestError && cause.status === 401) {
          setUser(null);
          return;
        }
        setError(cause instanceof Error ? cause.message : "Could not load your session");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      const { user: nextUser } = await request<{ user: User }>(
        registering ? "/api/auth/register" : "/api/auth/login",
        { method: "POST", body: JSON.stringify(payload) },
      );
      setUser(nextUser);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setError("");
    try {
      await request<void>("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not log out");
    }
  }

  if (loading) return <main className="loading">Loading your workspace…</main>;

  if (user) {
    return (
      <AuthenticatedWorkspace user={user} error={error} onLogout={handleLogout} />
    );
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <div className="brand-mark" aria-hidden="true">E</div>
        <p className="eyebrow">ENTERPRISE RESOURCE PLANNING</p>
        <h1>{registering ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">
          {registering ? "Create an employee account to get started." : "Sign in to continue to your workspace."}
        </p>
        <form onSubmit={handleSubmit}>
          {registering && (
            <label>
              Full name
              <input name="name" autoComplete="name" required maxLength={120} />
            </label>
          )}
          <label>
            Work email
            <input name="email" type="email" autoComplete="email" required maxLength={254} />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={12}
              maxLength={128}
            />
            {registering && <span className="field-hint">Use at least 12 characters.</span>}
          </label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>
            {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="switch-mode">
          {registering ? "Already have an account?" : "New to the workspace?"}{" "}
          <button className="text-button" onClick={() => { setError(""); setRegistering(!registering); }}>
            {registering ? "Sign in" : "Create account"}
          </button>
        </p>
        {registering && <p className="field-hint">Self-registration creates an Employee account. Access to other roles is managed by a Super Admin.</p>}
      </section>
    </main>
  );
}

function AuthenticatedWorkspace({
  user,
  error,
  onLogout,
}: {
  user: User;
  error: string;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<WorkspacePage>("dashboard");

  return (
    <WorkspaceLayout
      user={user}
      page={page}
      onNavigate={setPage}
      onLogout={onLogout}
      error={error}
    >
      {page === "dashboard" ? (
        <DashboardView user={user} />
      ) : page === "users" && user.role === "SUPER_ADMIN" ? (
        <UserManagementView />
      ) : page === "inventory" && ["SUPER_ADMIN", "MANAGER", "INVENTORY_MANAGER"].includes(user.role) ? (
        <InventoryView />
      ) : page === "finance" && ["SUPER_ADMIN", "ACCOUNTANT"].includes(user.role) ? (
        <FinanceView />
      ) : page === "reports" && ["SUPER_ADMIN", "MANAGER", "ACCOUNTANT"].includes(user.role) ? (
        <ReportsView />
      ) : (
        <ModulePlaceholder page={page} />
      )}
    </WorkspaceLayout>
  );
}

function ModulePlaceholder({ page }: { page: Exclude<WorkspacePage, "dashboard"> }) {
  const content: Record<Exclude<WorkspacePage, "dashboard">, { title: string; description: string }> = {
    users: {
      title: "User management",
      description: "Manage team accounts, assign roles, and control access from one place.",
    },
    inventory: {
      title: "Inventory",
      description: "Products, stock levels, categories, and movement history will live here.",
    },
    finance: {
      title: "Finance",
      description: "Financial tools and reports will be available here as the module is built.",
    },
    reports: {
      title: "Reports",
      description: "Workspace reporting will be available here as your ERP modules are connected.",
    },
  };
  const selected = content[page];

  return (
    <section className="module-placeholder">
      <span className="module-placeholder__badge">COMING NEXT</span>
      <h2>{selected.title}</h2>
      <p>{selected.description}</p>
      <p className="module-placeholder__hint">This section is not connected yet. Your signed-in session is active.</p>
    </section>
  );
}
