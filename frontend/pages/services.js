import ServiceGrid from "../components/ServiceGrid";

export default function ServicesPage() {
  return (
    <main className="page-shell workspace-shell">
      <section className="panel hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Services</div>
            <h1>Select a card generation service</h1>
            <p className="muted">
              Each service carries its own template logic, extraction context,
              preview strategy, and output workflow.
            </p>
          </div>

          <aside className="hero-side-card">
            <span className="service-tag">Catalog</span>
            <h2>Identity, health, tax, transport, and custom flows</h2>
            <p>
              Pick a service to jump directly into upload, crop, preview, and
              asset generation with the right context loaded.
            </p>
          </aside>
        </div>

        <ServiceGrid />
      </section>
    </main>
  );
}
