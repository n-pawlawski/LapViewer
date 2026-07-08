import { useCallback, useEffect, useState } from "react";
import {
  fetchAccount,
  fetchAdminUsers,
  updateAccountDisplayName,
  updateUserPermissions,
  type PermissionDefinition,
  type UserAdminRecord,
} from "../api/account";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "../lib/router";

export function AccountSettingsPage() {
  const { user, refresh } = useAuth();
  const { navigate } = useRouter();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const account = await fetchAccount();
      setDisplayName(account.user.displayName);
      setPermissionDefinitions(account.permissionDefinitions);
      if (account.user.canManagePermissions) {
        const users = await fetchAdminUsers();
        setAdminUsers(users);
      } else {
        setAdminUsers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (!loading && window.location.hash === "#account-permissions") {
      if (!user?.canManagePermissions) {
        navigate("/account");
        return;
      }
      document.getElementById("account-permissions")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, navigate, user?.canManagePermissions]);

  async function handleProfileSave(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setError(null);
    setProfileMessage(null);
    try {
      await updateAccountDisplayName(displayName);
      await refresh();
      setProfileMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePermissionToggle(targetUser: UserAdminRecord, permissionKey: string, enabled: boolean) {
    const nextPermissions = enabled
      ? [...targetUser.permissions, permissionKey]
      : targetUser.permissions.filter((key) => key !== permissionKey);

    setSavingUserId(targetUser.id);
    setError(null);
    try {
      const updated = await updateUserPermissions(targetUser.id, nextPermissions);
      setAdminUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (targetUser.id === user?.id) {
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setSavingUserId(null);
    }
  }

  const canViewStats = user?.permissions.includes("stats.view") ?? false;
  const canManagePermissions = user?.canManagePermissions ?? false;
  const showStatsNav = canViewStats || canManagePermissions;
  const showAdminHub = canManagePermissions || canViewStats;

  if (loading) {
    return (
      <AppShell>
        <div className="account-page">
          <p className="data-status">Loading account settings…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="account-page">
        <h1>Account settings</h1>

        {showAdminHub && (
          <nav className="account-hub-nav" aria-label="Account admin">
            <span className="account-hub-link account-hub-link--active">Profile</span>
            {showStatsNav && (
              <button
                type="button"
                className="account-hub-link"
                onClick={() => navigate("/account/stats")}
              >
                Stats
              </button>
            )}
            {canManagePermissions && (
              <a className="account-hub-link" href="#account-permissions">
                Permissions
              </a>
            )}
          </nav>
        )}

        <section className="account-section">
          <h2>Profile</h2>
          <form className="account-form" onSubmit={(e) => void handleProfileSave(e)}>
            <label className="account-field">
              <span>Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
            <div className="account-field">
              <span>Email</span>
              <div className="account-field-value">{user?.email ?? ""}</div>
            </div>
            <div className="account-actions">
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>
            {profileMessage && <p className="data-status data-status--ok">{profileMessage}</p>}
          </form>
        </section>

        {canManagePermissions && (
          <section className="account-section" id="account-permissions">
            <h2>Permissions</h2>
            <p className="account-lead">
              Manage feature permissions for each user. Only <strong>root</strong> and{" "}
              <strong>nick.pawlawski@gmail.com</strong> can access this panel.
            </p>

            <div className="account-permissions-table-wrap">
              <table className="account-permissions-table">
                <thead>
                  <tr>
                    <th>User</th>
                    {permissionDefinitions.map((permission) => (
                      <th key={permission.key}>{permission.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((adminUser) => (
                    <tr key={adminUser.id}>
                      <td>
                        <div className="account-user-cell">
                          <span className="account-user-name">{adminUser.displayName}</span>
                          <span className="account-user-email">{adminUser.email}</span>
                          {adminUser.isDevAccount && (
                            <span className="app-user-badge">DEV ACCOUNT</span>
                          )}
                        </div>
                      </td>
                      {permissionDefinitions.map((permission) => {
                        const checked = adminUser.permissions.includes(permission.key);
                        const busy = savingUserId === adminUser.id;
                        return (
                          <td key={permission.key} className="account-permission-cell">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={busy}
                              aria-label={`${permission.label} for ${adminUser.displayName}`}
                              onChange={(e) =>
                                void handlePermissionToggle(adminUser, permission.key, e.target.checked)
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {error && <p className="data-status data-status--error">{error}</p>}
      </div>
    </AppShell>
  );
}
