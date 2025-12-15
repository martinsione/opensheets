import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function renderApp() {
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
}

Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    renderApp();
  } else {
    renderApp();
  }
});
