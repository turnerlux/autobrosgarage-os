"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Auto Bros route failed", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="error-screen">
      <div className="error-panel" role="alert">
        <span className="error-code">Temporary problem</span>
        <h1>That didn&apos;t load.</h1>
        <p>Your saved shop records were not changed. Try again, or return to the command center.</p>
        {error.digest ? <small>Reference: {error.digest}</small> : null}
        <div className="error-actions">
          <button type="button" onClick={retry}>
            Try again
          </button>
          <Link href="/">Command center</Link>
        </div>
      </div>
    </main>
  );
}
