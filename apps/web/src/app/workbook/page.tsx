"use client";

import type GC from "@mescius/spread-sheets";
import { useCallback, useState } from "react";
import { Spreadsheet } from "@/components/spreadsheet";
import { createWebSpreadsheetService } from "@/lib/spreadsheet-service";
import { Chat } from "./chat";

export default function WorkbookPage() {
  const [workbook, setWorkbook] = useState<GC.Spread.Sheets.Workbook | null>(
    null,
  );

  const handleWorkbookInit = useCallback((wb: GC.Spread.Sheets.Workbook) => {
    setWorkbook(wb);
  }, []);

  const spreadsheetService = workbook
    ? createWebSpreadsheetService(() => workbook)
    : null;

  return (
    <div className="flex h-full w-full">
      {/* Spreadsheet - Main Area */}
      <div className="h-full flex-1 overflow-hidden">
        <Spreadsheet onInitialized={handleWorkbookInit} />
      </div>

      {/* AI Sidebar - Right Panel */}
      <div className="h-full w-[420px] overflow-hidden border-border border-l bg-background">
        {spreadsheetService ? (
          <Chat spreadsheetService={spreadsheetService} />
        ) : (
          <div className="flex h-full w-full animate-pulse items-center justify-center text-muted-foreground duration-300">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
