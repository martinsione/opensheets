"use client";

import type { ToolUIPart } from "ai";
import { Hand } from "lucide-react";
import { useCallback, useEffect } from "react";

type PendingApproval = {
  id: string;
  toolName: string;
  state: ToolUIPart["state"];
};

export type ToolApprovalBarProps = {
  pendingApproval: PendingApproval | null;
  onApprove: () => void;
  onApproveAll: () => void;
  onDecline: () => void;
};

export function ToolApprovalBar({
  pendingApproval,
  onApprove,
  onApproveAll,
  onDecline,
}: ToolApprovalBarProps) {
  const isOpen = pendingApproval?.state === "approval-requested";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onDecline();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onApprove();
      }
    },
    [isOpen, onDecline, onApprove],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const toolDisplayName = pendingApproval?.toolName
    ? formatToolName(pendingApproval.toolName)
    : "perform action";

  return (
    <div className="border-t bg-background px-3 py-3">
      <div className="flex items-center gap-2 pb-2">
        <Hand className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">Permission required</span>
        <span className="text-muted-foreground text-sm">·</span>
        <span className="text-muted-foreground text-sm">
          Agent wants to {toolDisplayName}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="flex items-center gap-2 rounded-md border bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <span className="text-sm">Allow</span>
          <kbd className="rounded bg-primary-foreground/20 px-1.5 py-0.5 font-mono text-xs">
            ↵
          </kbd>
        </button>

        <button
          type="button"
          onClick={onApproveAll}
          className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          Allow all edits
        </button>

        <button
          type="button"
          onClick={onDecline}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors hover:bg-muted"
        >
          <span className="text-sm">Decline</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
            ESC
          </kbd>
        </button>
      </div>
    </div>
  );
}

function formatToolName(toolName: string): string {
  const nameMap: Record<string, string> = {
    setCellRange: "edit cells",
    modifySheetStructure: "modify sheet structure",
    modifyWorkbookStructure: "modify workbook",
    copyTo: "copy data",
    modifyObject: "modify object",
    resizeRange: "resize range",
    clearCellRange: "clear cells",
  };

  return nameMap[toolName] || toolName.replace(/([A-Z])/g, " $1").toLowerCase();
}
