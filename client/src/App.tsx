import { AuthProvider, useAuth } from "./context/AuthContext";
import { CompareProvider } from "./context/CompareContext";
import { AuthGate } from "./components/AuthGate";
import { RequirePermission } from "./components/RequirePermission";
import { RouterProvider, useRouter } from "./lib/router";
import { ComparePage } from "./pages/ComparePage";
import { DataPage } from "./pages/DataPage";
import { IntakePage } from "./pages/IntakePage";
import { TracksPage } from "./pages/TracksPage";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { AdminStatsPage } from "./pages/AdminStatsPage";
import "./App.css";

function AppRoutes() {
  const { pathname } = useRouter();

  switch (pathname) {
    case "/compare":
      return <ComparePage />;
    case "/intake":
      return <IntakePage />;
    case "/tracks":
      return (
        <RequirePermission permission="tracks.manage" redirectTo="/">
          <TracksPage />
        </RequirePermission>
      );
    case "/account":
      return <AccountSettingsPage />;
    case "/account/stats":
      return (
        <RequirePermission requireStatsAccess redirectTo="/account">
          <AdminStatsPage />
        </RequirePermission>
      );
    case "/":
    default:
      return <DataPage />;
  }
}

function AuthenticatedApp() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="auth-gate">
        <div className="auth-gate-card">
          <p className="auth-gate-text">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AuthGate />;
  }

  return (
    <CompareProvider>
      <AppRoutes />
    </CompareProvider>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </RouterProvider>
  );
}
