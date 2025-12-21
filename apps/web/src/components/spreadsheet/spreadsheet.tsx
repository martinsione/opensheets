"use client";

import type GC from "@mescius/spread-sheets";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

// Dynamically import SpreadJS components to avoid SSR issues
const SpreadSheets = dynamic(
  () => import("@mescius/spread-sheets-react").then((mod) => mod.SpreadSheets),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full animate-pulse items-center justify-center text-muted-foreground duration-300">
        Loading spreadsheet...
      </div>
    ),
  },
);

const Worksheet = dynamic(
  () => import("@mescius/spread-sheets-react").then((mod) => mod.Worksheet),
  { ssr: false },
);

export interface SpreadsheetHandle {
  getWorkbook: () => GC.Spread.Sheets.Workbook | null;
}

interface SpreadsheetProps {
  onInitialized?: (workbook: GC.Spread.Sheets.Workbook) => void;
  className?: string;
}

export function Spreadsheet({ onInitialized, className }: SpreadsheetProps) {
  const workbookRef = useRef<GC.Spread.Sheets.Workbook | null>(null);
  const isInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Load CSS and plugins on mount
  useEffect(() => {
    // Import styles
    import(
      "@mescius/spread-sheets/styles/gc.spread.sheets.excel2016colorful.css"
    );
    // Import plugins
    Promise.all([
      import("@mescius/spread-sheets-charts"),
      import("@mescius/spread-sheets-pivot-addon"),
    ]).then(() => {
      setIsReady(true);
    });
  }, []);

  const handleWorkbookInit = useCallback(
    (spread: GC.Spread.Sheets.Workbook) => {
      // Prevent double initialization
      if (isInitialized.current) return;
      isInitialized.current = true;

      workbookRef.current = spread;

      // Configure workbook defaults
      spread.options.tabStripVisible = true;
      spread.options.allowUserDragDrop = true;
      spread.options.allowUserDragFill = true;
      spread.options.allowUserResize = true;
      spread.options.allowContextMenu = true;
      spread.options.allowUserEditFormula = true;

      // Set default sheet options
      const sheet = spread.getActiveSheet();
      if (sheet) {
        sheet.setRowCount(1000);
        sheet.setColumnCount(26);
      }

      onInitialized?.(spread);
    },
    [onInitialized],
  );

  if (!isReady) {
    return (
      <div className="flex h-full w-full animate-pulse items-center justify-center text-muted-foreground duration-300">
        Loading spreadsheet...
      </div>
    );
  }

  return (
    <SpreadSheets
      workbookInitialized={handleWorkbookInit}
      hostStyle={{
        width: "100%",
        height: "100%",
      }}
      hostClass={className}
    >
      <Worksheet name="Sheet1" />
    </SpreadSheets>
  );
}
