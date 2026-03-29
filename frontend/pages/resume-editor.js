import Link from "next/link";
import ResumeEditor from "../components/ResumeEditor";

export default function ResumeEditorPage() {
  return (
    <main className="page-shell">
      <section className="panel">
        <div className="eyebrow">Resume Editor</div>
        <h1>Safe Resume PDF Workspace</h1>
        <p className="muted">
          Open a personal resume or CV, review it visually, and add safe overlays,
          notes, highlights, and whiteout blocks.
        </p>

        <Link className="button reset-button" href="/dashboard">
          Back to dashboard
        </Link>

        <ResumeEditor />
      </section>
    </main>
  );
}
