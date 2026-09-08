import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self-hosted, so the page makes no font request and works offline once loaded.
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";

import "./styles/tokens.css";
import "./styles/global.css";
import { App } from "./App.tsx";

const container = document.getElementById("root");
if (!container) throw new Error("index.html is missing its #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
