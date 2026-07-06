import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "register";

export function AuthGate() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, displayName });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate-card">
        <h1 className="auth-gate-title">LapViewer</h1>
        <p className="auth-gate-text">Sign in or create an account to continue.</p>

        <div className="auth-gate-tabs">
          <button
            type="button"
            className={`auth-gate-tab auth-gate-tab--login ${mode === "login" ? "auth-gate-tab--active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-gate-tab auth-gate-tab--register ${mode === "register" ? "auth-gate-tab--active" : ""}`}
            onClick={() => switchMode("register")}
          >
            Create account
          </button>
        </div>

        <form className="auth-gate-form" onSubmit={(e) => void handleSubmit(e)}>
          {mode === "register" && (
            <label className="auth-field">
              <span>Display name</span>
              <input
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
          )}
          <label className="auth-field">
            <span>{mode === "login" ? "Username or email" : "Email"}</span>
            <input
              type={mode === "login" ? "text" : "email"}
              autoComplete={mode === "login" ? "username" : "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </label>
          <button
            type="submit"
            className={`btn auth-gate-button ${mode === "login" ? "btn-auth-login" : "btn-auth-register"}`}
            disabled={busy}
          >
            {busy
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {error && <p className="auth-gate-error">{error}</p>}
      </div>
    </div>
  );
}
