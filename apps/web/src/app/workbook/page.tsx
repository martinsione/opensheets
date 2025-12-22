"use client";

import type GC from "@mescius/spread-sheets";
import { useCallback, useMemo, useRef } from "react";
import { Spreadsheet } from "@/components/spreadsheet";
import { createWebSpreadsheetService } from "@/lib/spreadsheet-service";
import { Chat } from "./chat";

export default function WorkbookPage() {
  const workbookRef = useRef<GC.Spread.Sheets.Workbook | null>(null);

  const handleWorkbookInit = useCallback((wb: GC.Spread.Sheets.Workbook) => {
    workbookRef.current = wb;
  }, []);

  const spreadsheetService = useMemo(
    () => createWebSpreadsheetService(() => workbookRef.current),
    [],
  );

  return (
    <div className="flex h-full w-full">
      <div className="h-full flex-1 overflow-hidden">
        <Spreadsheet onInitialized={handleWorkbookInit} />
      </div>

      {/* AI Sidebar - Right Panel */}
      <div className="h-full w-[420px] overflow-hidden border-border border-l bg-background">
        <Chat spreadsheetService={spreadsheetService} />
      </div>
    </div>
  );
}
