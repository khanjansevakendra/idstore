import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="page-shell workspace-shell">
      <section className="panel hero-panel login-panel">
        <div className="hero-grid hero-grid-single">
          <div className="hero-copy">
            <div className="eyebrow">ID Card Generator System</div>
            <h1>Professional document workspace for operators</h1>
            <p className="muted">
              Manage extraction, template mapping, crop presets, resume review,
              and front-back asset generation from one premium workflow.
            </p>

            <div className="hero-kpis">
              <article>
                <strong>Multi-Service</strong>
                <span>Aadhaar, PAN, health, transport, and custom sample flows</span>
              </article>
              <article>
                <strong>Operator Ready</strong>
                <span>Quick upload, preview, review notes, and asset delivery</span>
              </article>
            </div>
          </div>

          <form className="stack glass-form">
            <label>
              Operator ID
              <input type="text" placeholder="Enter username" />
            </label>

            <label>
              Password
              <input type="password" placeholder="Enter password" />
            </label>

            <Link className="button primary premium-button" href="/dashboard">
              Continue to Workspace
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}
