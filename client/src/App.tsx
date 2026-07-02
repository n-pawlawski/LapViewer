import { CompareProvider } from "./context/CompareContext";
import { RouterProvider, useRouter } from "./lib/router";
import { ComparePage } from "./pages/ComparePage";
import { DataPage } from "./pages/DataPage";
import { IntakePage } from "./pages/IntakePage";
import { TracksPage } from "./pages/TracksPage";
import "./App.css";

function AppRoutes() {
  const { pathname } = useRouter();

  switch (pathname) {
    case "/compare":
      return <ComparePage />;
    case "/intake":
      return <IntakePage />;
    case "/tracks":
      return <TracksPage />;
    case "/":
    default:
      return <DataPage />;
  }
}

export default function App() {
  return (
    <RouterProvider>
      <CompareProvider>
        <AppRoutes />
      </CompareProvider>
    </RouterProvider>
  );
}
