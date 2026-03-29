import Link from "next/link";

const quickActions = [
  {
    title: "Choose Service",
    description: "Pick the ID type and open its configured template flow.",
    href: "/services"
  },
  {
    title: "Upload Source File",
    description: "Submit a PDF or image and prepare it for extraction.",
    href: "/upload-file"
  },
  {
    title: "Preview Card",
    description: "Inspect generated front and back card assets.",
    href: "/preview-card"
  },
  {
    title: "Resume Editor",
    description: "Open a safe personal resume/CV editing workspace.",
    href: "/resume-editor"
  }
];

export default function DashboardPage() {
  return (
    <main className="page-shell workspace-shell">
      <section className="panel hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Dashboard</div>
            <h1>Document services workspace</h1>
            <p className="muted">
              Manage Aadhaar, PAN, Voter ID, Driving Licence, healthcare cards,
              custom samples, and resume tools from one polished control center.
            </p>

            <div className="hero-kpis">
              <article>
                <strong>4 Core Tools</strong>
                <span>Services, upload, preview, and resume editing</span>
              </article>
              <article>
                <strong>Review Driven</strong>
                <span>Crop presets, live previews, safe overlays, and downloads</span>
              </article>
              <article>
                <strong>Fast Output</strong>
                <span>Front-back PNG generation with reusable settings</span>
              </article>
            </div>
          </div>

          <aside className="hero-side-card">
            <span className="service-tag">Operator Flow</span>
            <h2>Upload. Review. Generate.</h2>
            <p>
              Keep document handling clean and consistent with a premium operator
              experience across desktop and mobile.
            </p>
          </aside>
        </div>

        <div className="action-grid premium-grid">
          {quickActions.map((item) => (
            <Link className="action-card" href={item.href} key={item.title}>
              <span className="card-index">0{quickActions.indexOf(item) + 1}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <span className="card-link-copy">Open module</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
