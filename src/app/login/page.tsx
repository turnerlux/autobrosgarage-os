import Link from "next/link";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <Link className="brand" href="/" aria-label="Auto Bros OS home">
          <span className="brand-mark" aria-hidden="true">
            AB
          </span>
          <span>
            <strong>Auto Bros</strong>
            <small>Garage OS</small>
          </span>
        </Link>
        <div>
          <div className="eyebrow">Staff access</div>
          <h1>Sign in to your work.</h1>
          <p className="intro">
            Owners see the whole operation. Technicians see assigned jobs, vehicle details, and the
            notes they need to complete the work.
          </p>
        </div>
        <LoginForm />
        <p className="login-help">Need access changed? Ask Turner or Arthur.</p>
      </section>
    </main>
  );
}
