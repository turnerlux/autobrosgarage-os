"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Auto Bros OS — Recovery</title>
      </head>
      <body style={{ margin: 0, background: "#0b0c0e", color: "#f5f3ee", fontFamily: "system-ui" }}>
        <main
          style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1rem" }}
        >
          <div
            style={{
              maxWidth: "32rem",
              border: "1px solid #2a2e35",
              borderRadius: "1rem",
              padding: "1.5rem",
              background: "#121418",
            }}
          >
            <p style={{ color: "#ff5a2f", fontWeight: 700 }}>Auto Bros OS</p>
            <h1>We hit a system problem.</h1>
            <p style={{ color: "#b0b2b7", lineHeight: 1.6 }}>
              Your saved records were not changed. Retry the application; if the problem continues,
              report the time it happened.
            </p>
            <button
              type="button"
              onClick={retry}
              style={{
                minHeight: "3rem",
                padding: "0 1rem",
                border: 0,
                borderRadius: ".7rem",
                background: "#ff5a2f",
                color: "white",
                fontWeight: 700,
              }}
            >
              Retry Auto Bros OS
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
