import { useEffect, useState, type FormEvent } from "react";
import {
  createUser,
  fetchUsers,
  UserServiceError,
  type User,
  type UserRole,
} from "./services/userService";

const roles: { value: UserRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
];

export function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    fetchUsers()
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(getErrorMessage(cause, "Could not load users"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const formData = new FormData(event.currentTarget);
    const role = roles.find((item) => item.value === String(formData.get("role") ?? ""));
    if (!role) {
      setFormError("Select a valid workspace role.");
      return;
    }

    const userData = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      role: role.value,
    };

    setCreating(true);
    try {
      const newUser = await createUser(userData);
      setUsers((currentUsers) => [newUser, ...currentUsers]);
      setShowCreateForm(false);
    } catch (cause) {
      setFormError(getErrorMessage(cause, "Could not create the user"));
    } finally {
      setCreating(false);
    }
  }

  function openCreateForm() {
    setFormError("");
    setShowCreateForm(true);
  }

  return (
    <section className="users-page">
      <header className="users-page__header">
        <div>
          <p className="dashboard-eyebrow users-page__eyebrow">WORKSPACE ADMINISTRATION</p>
          <h1>User management</h1>
          <p>Manage team accounts and assign access to ERP modules.</p>
        </div>
        <button className="users-create-button" onClick={openCreateForm}>
          <span aria-hidden="true">+</span>
          Create user
        </button>
      </header>

      <div className="users-summary" aria-live="polite">
        <strong>{loading ? "—" : users.length}</strong>
        <span>{users.length === 1 ? "user account" : "user accounts"}</span>
      </div>

      {loadError && (
        <p className="users-alert" role="alert">
          {loadError}
        </p>
      )}

      <div className="users-table-card">
        <div className="users-table-card__heading">
          <div>
            <h2>Team members</h2>
            <p>Accounts in this ERP workspace</p>
          </div>
        </div>
        {loading ? (
          <div className="users-state" role="status">Loading users…</div>
        ) : loadError ? (
          <div className="users-state">User list is unavailable. Refresh the page after checking your connection.</div>
        ) : users.length === 0 ? (
          <div className="users-state">
            <strong>No users yet</strong>
            <span>Create a user to start building your team.</span>
          </div>
        ) : (
          <div className="users-table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date added</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="users-table__person">
                        <span className="users-table__avatar">{getInitials(user.name)}</span>
                        <span>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </span>
                      </div>
                    </td>
                    <td><span className={`users-role users-role--${user.role.toLowerCase()}`}>{formatRole(user.role)}</span></td>
                    <td>
                      <span className={`users-status${user.isActive ? " users-status--active" : ""}`}>
                        <span aria-hidden="true" />
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className="user-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !creating) setShowCreateForm(false);
        }}>
          <section className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
            <header className="user-dialog__header">
              <div>
                <span className="user-dialog__icon" aria-hidden="true">+</span>
                <div>
                  <h2 id="create-user-title">Create user</h2>
                  <p>Add a team member and choose their workspace role.</p>
                </div>
              </div>
              <button
                type="button"
                className="user-dialog__close"
                aria-label="Close dialog"
                disabled={creating}
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </header>
            <form className="user-form" onSubmit={handleCreateUser}>
              <label>
                Full name
                <input name="name" autoComplete="name" required maxLength={120} />
              </label>
              <label>
                Work email
                <input name="email" type="email" autoComplete="email" required maxLength={254} />
              </label>
              <label>
                Temporary password
                <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
                <span className="field-hint">At least 12 characters. Share it securely with the user.</span>
              </label>
              <label>
                Workspace role
                <select name="role" defaultValue="EMPLOYEE">
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>
              {formError && <p className="error-message" role="alert">{formError}</p>}
              <div className="user-form__actions">
                <button type="button" className="user-cancel-button" disabled={creating} onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="users-create-button" disabled={creating}>
                  {creating ? "Creating…" : "Create user"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function getErrorMessage(cause: unknown, fallback: string): string {
  if (!(cause instanceof Error)) return fallback;
  if (cause instanceof UserServiceError && cause.status === 401) return "Authentication required. Your session may have expired.";
  if (cause instanceof UserServiceError && cause.status === 403) return "Insufficient permissions. User management is restricted to Super Admins.";
  return cause.message || fallback;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

function formatRole(role: UserRole): string {
  return roles.find((item) => item.value === role)?.label ?? role.replace(/_/g, " ");
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}
