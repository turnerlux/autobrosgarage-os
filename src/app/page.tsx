const workflowCards = [
  { label: "Active jobs", value: "—", detail: "Job records arrive in Phase 1" },
  { label: "Needs attention", value: "—", detail: "Exceptions will surface here" },
  { label: "Waiting approval", value: "—", detail: "Customer approvals are not connected" },
  { label: "Ready pickup", value: "—", detail: "Repair status is not connected" },
];

const navigation = ["AI", "Jobs", "Customers", "Diagnostics", "Money", "More"];
const navigationHrefs: Record<string, string> = {
  AI: "/ai",
  Diagnostics: "/diagnostics",
};

export default function Home() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Auto Bros OS home">
          <span className="brand-mark" aria-hidden="true">
            AB
          </span>
          <span>
            <strong>Auto Bros</strong>
            <small>Garage OS</small>
          </span>
        </a>
        <span className="environment-badge">Local foundation</span>
      </header>

      <section className="workspace" id="top">
        <div className="eyebrow">Shop command center</div>
        <div className="hero-row">
          <div>
            <h1>Good work starts with less paperwork.</h1>
            <p className="intro">
              Tell Auto Bros AI what came into the shop. It will organize the job, preserve the
              source records, and surface only the decisions that need a person.
            </p>
          </div>
          <button
            className="quote-button"
            type="button"
            disabled
            title="Available after core records are implemented"
          >
            <span aria-hidden="true">+</span> Create quote
          </button>
        </div>

        <form className="command-bar" aria-label="Auto Bros AI command" action="#">
          <div className="command-icon" aria-hidden="true">
            ✦
          </div>
          <label htmlFor="command">What needs doing?</label>
          <textarea
            id="command"
            name="command"
            rows={2}
            placeholder="Check in a vehicle, find a job, or describe a shop task…"
            disabled
          />
          <div className="command-actions" aria-label="Input options coming in a later phase">
            <button type="button" disabled aria-label="Attach a photo">
              Camera
            </button>
            <button type="button" disabled aria-label="Record a voice note">
              Voice
            </button>
            <button type="submit" disabled>
              Send
            </button>
          </div>
        </form>

        <div className="section-heading">
          <div>
            <span className="eyebrow">Today at a glance</span>
            <h2>Operations</h2>
          </div>
          <span className="data-state">Waiting for database connection</span>
        </div>

        <section className="workflow-grid" aria-label="Shop workflow summary">
          {workflowCards.map((card) => (
            <article className="workflow-card" key={card.label}>
              <div className="card-topline">
                <h3>{card.label}</h3>
                <span>{card.value}</span>
              </div>
              <p>{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="foundation-note">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>Foundation ready</h2>
            <p>
              This shell intentionally shows no sample customer or financial data. Core records,
              authentication, and authorized AI tools will be connected through server-side
              boundaries.
            </p>
          </div>
        </section>
      </section>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {navigation.map((item) => (
          <a href={navigationHrefs[item] ?? `#${item.toLowerCase()}`} key={item}>
            <span aria-hidden="true">{item === "AI" ? "✦" : "•"}</span>
            {item}
          </a>
        ))}
      </nav>
    </main>
  );
}
