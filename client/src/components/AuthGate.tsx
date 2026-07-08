import { useEffect, useState } from "react";
import { googleSignInUrl } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "../lib/router";

export function AuthGate() {
  const { login, devUserMode, googleAuthEnabled } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("root");
  const [password, setPassword] = useState("root");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) {
      setError(authError);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [searchParams]);

  async function handleDevLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate-card">
        <h1 className="auth-gate-title">DeltaView</h1>
        <p className="auth-gate-text">Sign in with Google to continue.</p>

        {googleAuthEnabled ? (
          <a className="btn auth-gate-google" href={googleSignInUrl()}>
            <span className="auth-gate-google-icon" aria-hidden="true">
              G
            </span>
            Continue with Google
          </a>
        ) : (
          <p className="auth-gate-setup-hint">
            Google sign-in is not configured. Set <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code> in your environment.
          </p>
        )}

        {devUserMode && (
          <div className="auth-gate-dev">
            <div className="auth-gate-divider">
              <span>Dev only</span>
            </div>
            {!devOpen ? (
              <button
                type="button"
                className="btn btn-secondary auth-gate-dev-toggle"
                onClick={() => setDevOpen(true)}
              >
                Dev login
              </button>
            ) : (
              <form className="auth-gate-form auth-gate-form--dev" onSubmit={(e) => void handleDevLogin(e)}>
                <label className="auth-field">
                  <span>Username</span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="auth-field">
                  <span>Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="btn btn-secondary auth-gate-button" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in as dev"}
                </button>
              </form>
            )}
          </div>
        )}

        {error && <p className="auth-gate-error">{error}</p>}
      </div>
    </div>
  );
}
