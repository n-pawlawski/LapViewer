import { useCallback, useEffect, useState } from "react";
import { fetchAllUsersStats, type UserStatsBundle } from "../api/stats";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "../lib/router";

const STAT_KEYS = ["auth.login_count", "sessions.count", "tracks.count"] as const;

function statValue(bundle: UserStatsBundle, key: string): number {
  return bundle.stats.find((item) => item.key === key)?.value ?? 0;
}

export function AdminStatsPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [users, setUsers] = useState<UserStatsBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManagePermissions = user?.canManagePermissions ?? false;

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllUsersStats();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <AppShell>
      <div className="account-page">
        <nav className="account-hub-nav" aria-label="Account admin">
          <button type="button" className="account-hub-link" onClick={() => navigate("/account")}>
            Account settings
          </button>
          <span className="account-hub-link account-hub-link--active">Stats</span>
          {canManagePermissions && (
            <button
              type="button"
              className="account-hub-link"
              onClick={() => navigate("/account#account-permissions")}
            >
              Permissions
            </button>
          )}
        </nav>

        <h1>User stats</h1>
        <p className="account-lead">
          Per-user counters and computed metrics. Login count increments on each successful sign-in.
        </p>

        {loading && <p className="data-status">Loading stats…</p>}

        {!loading && (
          <div className="account-stats-table-wrap">
            <table className="account-stats-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Logins</th>
                  <th>Sessions</th>
                  <th>Tracks</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.userId}>
                    <td>
                      <div className="account-user-cell">
                        <span className="account-user-name">{entry.displayName}</span>
                        <span className="account-user-email">{entry.email}</span>
                        {entry.isDevAccount && <span className="app-user-badge">DEV ACCOUNT</span>}
                      </div>
                    </td>
                    {STAT_KEYS.map((key) => (
                      <td key={key} className="account-stat-value">
                        {statValue(entry, key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="data-status data-status--error">{error}</p>}
      </div>
    </AppShell>
  );
}
