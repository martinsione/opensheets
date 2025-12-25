import { Chat } from "@repo/core/components/chat";
import type { SpreadsheetService } from "@repo/core/spreadsheet-service";
import React from "react";
import { createRoot } from "react-dom/client";
import { excelService } from "@/spreadsheet-service";
import "@repo/core/styles.css";

function renderApp(spreadsheetService: SpreadsheetService) {
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen overflow-hidden">
          <Chat spreadsheetService={spreadsheetService} environment="excel" />
        </div>
      </React.StrictMode>,
    );
  }
}

renderApp(excelService);
