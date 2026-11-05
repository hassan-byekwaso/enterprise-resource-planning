type User = {
  name: string;
  role: string;
};

const summaryCards = [
  { label: "Active employees", value: "—", note: "Available with user management" },
  { label: "Products in stock", value: "—", note: "Available with inventory" },
  { label: "Open alerts", value: "—", note: "Available with inventory" },
  { label: "Monthly activity", value: "—", note: "Available as modules are enabled" },
];

export function DashboardView({ user }: { user: User }) {
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="dashboard">
      <section className="dashboard-welcome">
        <div>
          <p className="dashboard-eyebrow">YOUR ERP WORKSPACE</p>
          <h1>Good to see you, {firstName}</h1>
          <p>Here’s your workspace overview. Business metrics will appear as modules are connected.</p>
        </div>
        <div className="dashboard-welcome__decoration" aria-hidden="true">
          <span className="dashboard-welcome__orb dashboard-welcome__orb--one" />
          <span className="dashboard-welcome__orb dashboard-welcome__orb--two" />
          <span className="dashboard-welcome__graphic">E</span>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="summary-heading">
        <div className="dashboard-section__heading">
          <div>
            <h2 id="summary-heading">Workspace summary</h2>
            <p>Key figures from your connected ERP modules</p>
          </div>
          <span className="dashboard-period">OVERVIEW</span>
        </div>
        <div className="summary-grid">
          {summaryCards.map((card, index) => (
            <article className="summary-card" key={card.label}>
              <div className={`summary-card__icon summary-card__icon--${index + 1}`} aria-hidden="true">
                <SummaryIcon index={index} />
              </div>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.note}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-lower">
        <article className="dashboard-panel getting-started">
          <div className="dashboard-section__heading">
            <div>
              <h2>Getting started</h2>
              <p>Your workspace foundation is in place</p>
            </div>
          </div>
          <ul className="setup-list">
            <li className="setup-list__item setup-list__item--complete">
              <span className="setup-list__marker" aria-hidden="true">✓</span>
              <div><strong>Secure sign-in</strong><span>Your account and session are active.</span></div>
              <span className="setup-list__status">READY</span>
            </li>
            <li className="setup-list__item">
              <span className="setup-list__marker" aria-hidden="true">2</span>
              <div><strong>Manage your team</strong><span>Create accounts and assign workspace roles.</span></div>
              <span className="setup-list__status setup-list__status--next">NEXT</span>
            </li>
            <li className="setup-list__item">
              <span className="setup-list__marker" aria-hidden="true">3</span>
              <div><strong>Set up inventory</strong><span>Add products and start tracking stock.</span></div>
              <span className="setup-list__status setup-list__status--later">LATER</span>
            </li>
          </ul>
        </article>

        <article className="dashboard-panel account-panel">
          <div className="dashboard-section__heading">
            <div>
              <h2>Your account</h2>
              <p>Current access and workspace role</p>
            </div>
          </div>
          <div className="account-panel__user">
            <span className="account-panel__avatar">{firstName[0]?.toUpperCase() ?? "U"}</span>
            <div><strong>{user.name}</strong><span>Signed in to ERP Workspace</span></div>
          </div>
          <div className="account-panel__role">
            <span>ACCESS ROLE</span>
            <strong>{user.role.replace(/_/g, " ")}</strong>
          </div>
          <p className="account-panel__note">Your role determines which workspace sections are available to you.</p>
        </article>
      </section>
    </div>
  );
}

function SummaryIcon({ index }: { index: number }) {
  const icons = [
    <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0M19 8v6M16 11h6" /></>,
    <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
  ];

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {icons[index]}
    </svg>
  );
}
