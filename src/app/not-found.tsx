import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-screen">
      <div className="error-panel">
        <span className="error-code">404</span>
        <h1>There&apos;s nothing here.</h1>
        <p>The page may have moved, or the record may not be available to this account.</p>
        <div className="error-actions">
          <Link href="/">Return to command center</Link>
        </div>
      </div>
    </main>
  );
}
