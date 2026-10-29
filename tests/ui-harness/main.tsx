import { createRoot } from "react-dom/client";
import { AppShell } from "../../src/components/app-shell";
import { Planner } from "../../src/components/planner";
import "../../app/globals.css";
const path = window.location.pathname
  .replace(/^\/app\/?/, "")
  .split("/")
  .filter(Boolean);
createRoot(document.getElementById("root")!).render(
  <>
    <aside
      aria-label="Synthetic test environment"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "4px 16px",
        textAlign: "right",
        background: "#fff0d7",
        color: "#664422",
        zIndex: 99,
        fontSize: 10,
      }}
    >
      Synthetic UI test · Controlled API fixtures · No live authentication or
      Gemini
    </aside>
    <AppShell email="synthetic@example.test">
      <Planner path={path} />
    </AppShell>
  </>,
);
