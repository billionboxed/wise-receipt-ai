import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Ensure production installs receive updates promptly (helps avoid stale auth behavior)
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Force the new version to activate and reload the page
    updateSW(true);
  },
});

createRoot(document.getElementById("root")!).render(<App />);

