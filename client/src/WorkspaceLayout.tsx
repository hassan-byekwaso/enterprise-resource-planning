import { useState, type ReactNode } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type WorkspacePage = "dashboard" | "users" | "inventory" | "finance" | "reports";

type NavigationItem = {
  id: WorkspacePage;
  label: string;
  icon: "dashboard" | "users" | "inventory" | "finance" | "reports";
  roles: string[];
};

const navigation: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", roles: [] },
  { id: "users", label: "User management", icon: "users", roles: ["SUPER_ADMIN"] },
  { id: "inventory", label: "Inventory", icon: "inventory", roles: ["SUPER_ADMIN", "MANAGER", "INVENTORY_MANAGER"] },
  { id: "finance", label: "Finance", icon: "finance", roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
  { id: "reports", label: "Reports", icon: "reports", roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTANT"] },
];

export function WorkspaceLayout({
  user,
  page,
  onNavigate,
  onLogout,
  error,
  children,
}: {
  user: User;
  page: WorkspacePage;
  onNavigate: (page: WorkspacePage) => void;
  onLogout: () => void;
  error: string;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const visibleNavigation = navigation.filter((item) => item.roles.length === 0 || item.roles.includes(user.role));
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  function navigate(nextPage: WorkspacePage) {
    onNavigate(nextPage);
    setMobileNavOpen(false);
  }

  return (
    <div className="workspace">
      {mobileNavOpen && (
        <button
          className="workspace__scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`workspace-sidebar${mobileNavOpen ? " workspace-sidebar--open" : ""}`}>
        <a className="workspace-brand" href="#" onClick={(event) => { event.preventDefault(); navigate("dashboard"); }}>
          <span className="workspace-brand__mark" aria-hidden="true">E</span>
          <span className="workspace-brand__text">
            <strong>Enterprise</strong>
            <small>RESOURCE PLANNING</small>
          </span>
        </a>

        <div className="workspace-sidebar__label">WORKSPACE</div>
        <nav className="workspace-nav" aria-label="Main navigation">
          {visibleNavigation.map((item) => (
            <button
              key={item.id}
              className={`workspace-nav__item${page === item.id ? " workspace-nav__item--active" : ""}`}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="workspace-sidebar__footer">
          <div className="workspace-help">
            <span className="workspace-help__icon" aria-hidden="true">?</span>
            <div>
              <strong>Need a hand?</strong>
              <span>Your workspace is ready to grow.</span>
            </div>
          </div>
          <button className="workspace-signout" onClick={onLogout}>
            <NavIcon name="logout" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            className="workspace-menu-toggle"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="workspace-topbar__context">
            <span>Workspace</span>
            <span className="workspace-topbar__separator">/</span>
            <strong>{navigation.find((item) => item.id === page)?.label ?? "Dashboard"}</strong>
          </div>
          <div className="workspace-profile" title={user.email}>
            <span className="workspace-profile__avatar">{initials || "U"}</span>
            <span className="workspace-profile__details">
              <strong>{user.name}</strong>
              <small>{user.role.replace(/_/g, " ")}</small>
            </span>
          </div>
        </header>

        <main className="workspace-content">
          {error && <p className="error-message workspace-error" role="alert">{error}</p>}
          {children}
        </main>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: NavigationItem["icon"] | "logout" }) {
  const paths: Record<typeof name, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    inventory: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5M12 13v8" /></>,
    finance: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    reports: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  };

  return (
    <svg aria-hidden="true" className="workspace-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
