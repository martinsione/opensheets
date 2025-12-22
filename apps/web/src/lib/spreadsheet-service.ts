import type GC from "@mescius/spread-sheets";
import type { tools } from "@repo/core/ai/tools";
import type { Sheet, SpreadsheetService } from "@repo/core/spreadsheet-service";
import type { InferToolInput, InferToolOutput } from "ai";

type Workbook = GC.Spread.Sheets.Workbook;

export function createWebSpreadsheetService(
  getWorkbook: () => Workbook | null,
): SpreadsheetService {
  return {
    async getSheets(): Promise<Sheet[]> {
      const workbook = getWorkbook();
      if (!workbook) return [];

      const sheets: Sheet[] = [];
      for (let i = 0; i < workbook.getSheetCount(); i++) {
        const sheet = workbook.getSheet(i);
        const usedRange = sheet.getUsedRange();
        sheets.push({
          id: i,
          name: sheet.name(),
          maxRows: usedRange ? usedRange.rowCount : 0,
          maxColumns: usedRange ? usedRange.colCount : 0,
        });
      }
      return sheets;
    },

    async getCellRanges(
      input: InferToolInput<typeof tools.getCellRanges>,
    ): Promise<InferToolOutput<typeof tools.getCellRanges>> {
      const { sheetId, ranges, cellLimit = 10000 } = input;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      const sheet = workbook.getSheet(sheetId);
      if (!sheet) throw new Error(`Sheet ${sheetId} not found`);

      const cells: Record<string, unknown> = {};
      let totalCellCount = 0;
      let hasMore = false;
      const nextRanges: string[] = [];

      const usedRange = sheet.getUsedRange();
      const dimension = usedRange
        ? `A1:${columnToLetter(usedRange.col + usedRange.colCount - 1)}${usedRange.row + usedRange.rowCount}`
        : undefined;

      for (let i = 0; i < ranges.length; i++) {
        const rangeStr = ranges[i];
        if (!rangeStr) continue;

        if (totalCellCount >= cellLimit) {
          nextRanges.push(...ranges.slice(i));
          hasMore = true;
          break;
        }

        const rangeInfo = parseRangeAddress(rangeStr);
        if (!rangeInfo) continue;

        for (let row = rangeInfo.startRow; row <= rangeInfo.endRow; row++) {
          if (totalCellCount >= cellLimit) {
            hasMore = true;
            break;
          }

          for (let col = rangeInfo.startCol; col <= rangeInfo.endCol; col++) {
            const value = sheet.getValue(row, col);
            const formula = sheet.getFormula(row, col);
            const cellAddr = `${columnToLetter(col)}${row + 1}`;

            if (formula) {
              cells[cellAddr] = [value, formula];
            } else if (value !== null && value !== "" && value !== undefined) {
              cells[cellAddr] = value;
            }
            totalCellCount++;
          }
        }
      }

      const result: InferToolOutput<typeof tools.getCellRanges> = {
        worksheet: {
          name: sheet.name(),
          sheetId,
          dimension,
          cells,
        },
        hasMore,
      };

      if (hasMore && nextRanges.length > 0) {
        result.nextRanges = nextRanges;
      }

      return result;
    },

    async setCellRange(
      input: InferToolInput<typeof tools.setCellRange>,
    ): Promise<InferToolOutput<typeof tools.setCellRange>> {
      const { sheetId, range, cells, copyToRange, resizeWidth, resizeHeight } =
        input;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      const sheet = workbook.getSheet(sheetId);
      if (!sheet) throw new Error(`Sheet ${sheetId} not found`);

      const rangeInfo = parseRangeAddress(range);
      if (!rangeInfo) throw new Error(`Invalid range: ${range}`);

      sheet.suspendPaint();
      try {
        const formulaResults: Record<string, number | string> = {};

        for (let r = 0; r < cells.length; r++) {
          const row = cells[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (!cell) continue;
            const targetRow = rangeInfo.startRow + r;
            const targetCol = rangeInfo.startCol + c;
            const cellAddr = `${columnToLetter(targetCol)}${targetRow + 1}`;

            if (cell.formula) {
              sheet.setFormula(targetRow, targetCol, cell.formula);
              const computed = sheet.getValue(targetRow, targetCol);
              if (computed !== null && computed !== undefined) {
                formulaResults[cellAddr] =
                  typeof computed === "number" || typeof computed === "string"
                    ? computed
                    : String(computed);
              }
            } else if (cell.value !== undefined) {
              sheet.setValue(targetRow, targetCol, cell.value);
            }

            if (cell.cellStyles) {
              const style = sheet.getStyle(targetRow, targetCol);
              const newStyle = style || {};

              if (cell.cellStyles.fontColor) {
                newStyle.foreColor = cell.cellStyles.fontColor;
              }
              if (cell.cellStyles.backgroundColor) {
                newStyle.backColor = cell.cellStyles.backgroundColor;
              }
              if (cell.cellStyles.fontSize) {
                newStyle.font = `${cell.cellStyles.fontSize}pt Calibri`;
              }
              if (cell.cellStyles.fontWeight === "bold") {
                newStyle.font = `bold ${newStyle.font || "11pt Calibri"}`;
              }
              if (cell.cellStyles.numberFormat) {
                newStyle.formatter = cell.cellStyles.numberFormat;
              }

              sheet.setStyle(targetRow, targetCol, newStyle);
            }
          }
        }

        if (copyToRange) {
          const destInfo = parseRangeAddress(copyToRange);
          if (destInfo) {
            const rowCount = rangeInfo.endRow - rangeInfo.startRow + 1;
            const colCount = rangeInfo.endCol - rangeInfo.startCol + 1;
            for (let r = 0; r < rowCount; r++) {
              for (let c = 0; c < colCount; c++) {
                const srcRow = rangeInfo.startRow + r;
                const srcCol = rangeInfo.startCol + c;
                const dstRow = destInfo.startRow + r;
                const dstCol = destInfo.startCol + c;

                const formula = sheet.getFormula(srcRow, srcCol);
                if (formula) {
                  sheet.setFormula(dstRow, dstCol, formula);
                } else {
                  const value = sheet.getValue(srcRow, srcCol);
                  sheet.setValue(dstRow, dstCol, value);
                }

                const style = sheet.getStyle(srcRow, srcCol);
                if (style) {
                  sheet.setStyle(dstRow, dstCol, style);
                }
              }
            }
          }
        }

        if (resizeWidth) {
          for (let col = rangeInfo.startCol; col <= rangeInfo.endCol; col++) {
            if (resizeWidth.type === "autofit") {
              sheet.autoFitColumn(col);
            } else if (
              resizeWidth.type === "points" &&
              resizeWidth.value !== undefined
            ) {
              sheet.setColumnWidth(col, resizeWidth.value);
            } else if (resizeWidth.type === "standard") {
              sheet.setColumnWidth(col, 64);
            }
          }
        }

        if (resizeHeight) {
          for (let row = rangeInfo.startRow; row <= rangeInfo.endRow; row++) {
            if (resizeHeight.type === "autofit") {
              sheet.autoFitRow(row);
            } else if (
              resizeHeight.type === "points" &&
              resizeHeight.value !== undefined
            ) {
              sheet.setRowHeight(row, resizeHeight.value);
            } else if (resizeHeight.type === "standard") {
              sheet.setRowHeight(row, 20);
            }
          }
        }

        const result: InferToolOutput<typeof tools.setCellRange> = {};
        if (Object.keys(formulaResults).length > 0) {
          result.formula_results = formulaResults;
        }
        return result;
      } finally {
        sheet.resumePaint();
      }
    },

    async searchData(
      input: InferToolInput<typeof tools.searchData>,
    ): Promise<InferToolOutput<typeof tools.searchData>> {
      const { searchTerm, sheetId, options = {} } = input;
      const {
        matchCase = false,
        matchEntireCell = false,
        maxResults = 500,
      } = options;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      const matches: Array<{
        sheetName: string;
        sheetId: number;
        a1: string;
        value: unknown;
        formula: string | null;
        row: number;
        column: number;
      }> = [];

      const sheetsToSearch =
        sheetId !== undefined
          ? [workbook.getSheet(sheetId)]
          : Array.from({ length: workbook.getSheetCount() }, (_, i) =>
              workbook.getSheet(i),
            );

      const searchTermLower = matchCase ? searchTerm : searchTerm.toLowerCase();

      for (const sheet of sheetsToSearch) {
        if (!sheet) continue;
        const usedRange = sheet.getUsedRange();
        if (!usedRange) continue;

        for (
          let row = usedRange.row;
          row < usedRange.row + usedRange.rowCount;
          row++
        ) {
          for (
            let col = usedRange.col;
            col < usedRange.col + usedRange.colCount;
            col++
          ) {
            if (matches.length >= maxResults) break;

            const value = sheet.getValue(row, col);
            if (value === null || value === undefined) continue;

            const valueStr = String(value);
            const compareValue = matchCase ? valueStr : valueStr.toLowerCase();

            let isMatch = false;
            if (matchEntireCell) {
              isMatch = compareValue === searchTermLower;
            } else {
              isMatch = compareValue.includes(searchTermLower);
            }

            if (isMatch) {
              const formula = sheet.getFormula(row, col);
              matches.push({
                sheetName: sheet.name(),
                sheetId: workbook.getSheetIndex(sheet.name()),
                a1: `${columnToLetter(col)}${row + 1}`,
                value,
                formula: formula || null,
                row: row + 1,
                column: col + 1,
              });
            }
          }
          if (matches.length >= maxResults) break;
        }
        if (matches.length >= maxResults) break;
      }

      return {
        matches,
        totalFound: matches.length,
        returned: matches.length,
        offset: 0,
        hasMore: false,
        searchTerm,
        searchScope: sheetId !== undefined ? `Sheet ${sheetId}` : "All sheets",
        nextOffset: null,
      };
    },

    async modifySheetStructure(
      input: InferToolInput<typeof tools.modifySheetStructure>,
    ): Promise<InferToolOutput<typeof tools.modifySheetStructure>> {
      const { sheetId, operation, dimension, reference, count = 1 } = input;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      const sheet = workbook.getSheet(sheetId);
      if (!sheet) throw new Error(`Sheet ${sheetId} not found`);

      switch (operation) {
        case "insert":
          if (dimension === "rows" && reference) {
            sheet.addRows(parseInt(reference, 10) - 1, count);
          } else if (dimension === "columns" && reference) {
            sheet.addColumns(letterToColumn(reference), count);
          }
          break;
        case "delete":
          if (dimension === "rows" && reference) {
            sheet.deleteRows(parseInt(reference, 10) - 1, count);
          } else if (dimension === "columns" && reference) {
            sheet.deleteColumns(letterToColumn(reference), count);
          }
          break;
        case "freeze":
          if (dimension === "rows") {
            sheet.frozenRowCount(count);
          } else if (dimension === "columns") {
            sheet.frozenColumnCount(count);
          }
          break;
        case "unfreeze":
          sheet.frozenRowCount(0);
          sheet.frozenColumnCount(0);
          break;
        case "hide":
          if (dimension === "rows" && reference) {
            const rowStart = parseInt(reference, 10) - 1;
            for (let i = 0; i < count; i++) {
              sheet.setRowVisible(rowStart + i, false);
            }
          } else if (dimension === "columns" && reference) {
            const colStart = letterToColumn(reference);
            for (let i = 0; i < count; i++) {
              sheet.setColumnVisible(colStart + i, false);
            }
          }
          break;
        case "unhide":
          if (dimension === "rows" && reference) {
            const rowStart = parseInt(reference, 10) - 1;
            for (let i = 0; i < count; i++) {
              sheet.setRowVisible(rowStart + i, true);
            }
          } else if (dimension === "columns" && reference) {
            const colStart = letterToColumn(reference);
            for (let i = 0; i < count; i++) {
              sheet.setColumnVisible(colStart + i, true);
            }
          }
          break;
      }

      return {};
    },

    async modifyWorkbookStructure(
      input: InferToolInput<typeof tools.modifyWorkbookStructure>,
    ): Promise<InferToolOutput<typeof tools.modifyWorkbookStructure>> {
      const { operation, sheetName, sheetId, newName } = input;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      switch (operation) {
        case "create": {
          if (!sheetName) throw new Error("sheetName is required");
          const sheetCount = workbook.getSheetCount();
          workbook.addSheet(sheetCount);
          const newSheet = workbook.getSheet(sheetCount);
          newSheet.name(sheetName);
          workbook.setActiveSheetIndex(sheetCount);
          return { sheetId: sheetCount, sheetName };
        }
        case "delete": {
          if (sheetId === undefined) throw new Error("sheetId is required");
          workbook.removeSheet(sheetId);
          return { message: "Sheet deleted" };
        }
        case "rename": {
          if (sheetId === undefined || !newName) {
            throw new Error("sheetId and newName are required");
          }
          const sheetToRename = workbook.getSheet(sheetId);
          if (sheetToRename) {
            sheetToRename.name(newName);
          }
          return { sheetId, sheetName: newName };
        }
        case "duplicate": {
          if (sheetId === undefined) throw new Error("sheetId is required");
          const source = workbook.getSheet(sheetId);
          if (source) {
            const copyName = newName || `${source.name()} (Copy)`;
            const sheetCount = workbook.getSheetCount();
            workbook.addSheet(sheetCount);
            const newSheet = workbook.getSheet(sheetCount);
            newSheet.name(copyName);
            const usedRange = source.getUsedRange();
            if (usedRange) {
              for (
                let r = usedRange.row;
                r < usedRange.row + usedRange.rowCount;
                r++
              ) {
                for (
                  let c = usedRange.col;
                  c < usedRange.col + usedRange.colCount;
                  c++
                ) {
                  const formula = source.getFormula(r, c);
                  if (formula) {
                    newSheet.setFormula(r, c, formula);
                  } else {
                    newSheet.setValue(r, c, source.getValue(r, c));
                  }
                  const style = source.getStyle(r, c);
                  if (style) {
                    newSheet.setStyle(r, c, style);
                  }
                }
              }
            }
            workbook.setActiveSheetIndex(sheetCount);
            return { sheetId: sheetCount, sheetName: copyName };
          }
          return {};
        }
      }
      return {};
    },

    async activateSheet(sheetId: number) {
      const workbook = getWorkbook();
      workbook?.setActiveSheetIndex(sheetId);
    },

    async clearSelection() {
      // SpreadJS handles this automatically
    },

    async selectRange(input) {
      const { sheetId, range } = input;
      const workbook = getWorkbook();
      if (!workbook) return;

      workbook.setActiveSheetIndex(sheetId);
      const sheet = workbook.getActiveSheet();
      const rangeInfo = parseRangeAddress(range);
      if (rangeInfo) {
        sheet.setSelection(
          rangeInfo.startRow,
          rangeInfo.startCol,
          rangeInfo.endRow - rangeInfo.startRow + 1,
          rangeInfo.endCol - rangeInfo.startCol + 1,
        );
      }
    },

    async getAllObjects(_input) {
      // SpreadJS charts and pivot tables would be implemented here
      return { objects: [] };
    },

    async modifyObject(_input) {
      // SpreadJS object modification would be implemented here
      return {};
    },

    async copyTo(input) {
      const { sheetId, sourceRange, destinationRange } = input;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      const sheet = workbook.getSheet(sheetId);
      if (!sheet) throw new Error(`Sheet ${sheetId} not found`);

      const sourceInfo = parseRangeAddress(sourceRange);
      const destInfo = parseRangeAddress(destinationRange);

      if (sourceInfo && destInfo) {
        const rowCount = sourceInfo.endRow - sourceInfo.startRow + 1;
        const colCount = sourceInfo.endCol - sourceInfo.startCol + 1;
        for (let r = 0; r < rowCount; r++) {
          for (let c = 0; c < colCount; c++) {
            const srcRow = sourceInfo.startRow + r;
            const srcCol = sourceInfo.startCol + c;
            const dstRow = destInfo.startRow + r;
            const dstCol = destInfo.startCol + c;

            const formula = sheet.getFormula(srcRow, srcCol);
            if (formula) {
              sheet.setFormula(dstRow, dstCol, formula);
            } else {
              sheet.setValue(dstRow, dstCol, sheet.getValue(srcRow, srcCol));
            }

            const style = sheet.getStyle(srcRow, srcCol);
            if (style) {
              sheet.setStyle(dstRow, dstCol, style);
            }
          }
        }
      }

      return {};
    },

    async clearCellRange(input) {
      const { sheetId, range, clearType = "contents" } = input;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      const sheet = workbook.getSheet(sheetId);
      if (!sheet) throw new Error(`Sheet ${sheetId} not found`);

      const rangeInfo = parseRangeAddress(range);
      if (!rangeInfo) throw new Error(`Invalid range: ${range}`);

      for (let row = rangeInfo.startRow; row <= rangeInfo.endRow; row++) {
        for (let col = rangeInfo.startCol; col <= rangeInfo.endCol; col++) {
          if (clearType === "contents" || clearType === "all") {
            sheet.setValue(row, col, null);
            sheet.setFormula(row, col, "");
          }
          if (clearType === "formats" || clearType === "all") {
            sheet.setStyle(
              row,
              col,
              undefined as unknown as GC.Spread.Sheets.Style,
            );
          }
        }
      }

      return {};
    },

    async resizeRange(input) {
      const { sheetId, range, width, height } = input;
      const workbook = getWorkbook();
      if (!workbook) throw new Error("Workbook not initialized");

      const sheet = workbook.getSheet(sheetId);
      if (!sheet) throw new Error(`Sheet ${sheetId} not found`);

      const rangeInfo = range ? parseRangeAddress(range) : null;
      const startCol = rangeInfo?.startCol ?? 0;
      const endCol = rangeInfo?.endCol ?? sheet.getColumnCount() - 1;
      const startRow = rangeInfo?.startRow ?? 0;
      const endRow = rangeInfo?.endRow ?? sheet.getRowCount() - 1;

      if (width) {
        for (let col = startCol; col <= endCol; col++) {
          if (width.type === "autofit") {
            sheet.autoFitColumn(col);
          } else if (width.type === "points" && width.value !== undefined) {
            sheet.setColumnWidth(col, width.value);
          } else if (width.type === "standard") {
            sheet.setColumnWidth(col, 64);
          }
        }
      }

      if (height) {
        for (let row = startRow; row <= endRow; row++) {
          if (height.type === "autofit") {
            sheet.autoFitRow(row);
          } else if (height.type === "points" && height.value !== undefined) {
            sheet.setRowHeight(row, height.value);
          } else if (height.type === "standard") {
            sheet.setRowHeight(row, 20);
          }
        }
      }

      return {};
    },
  };
}

function columnToLetter(columnIndex: number): string {
  let letter = "";
  let temp = columnIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function letterToColumn(letter: string): number {
  let column = 0;
  for (let i = 0; i < letter.length; i++) {
    column = column * 26 + (letter.charCodeAt(i) - 64);
  }
  return column - 1;
}

function parseRangeAddress(range: string): {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
} | null {
  const match = range.match(/^([A-Z]+)?(\d+)?(?::([A-Z]+)?(\d+)?)?$/i);
  if (!match) return null;

  const [, startColStr, startRowStr, endColStr, endRowStr] = match;

  const startCol = startColStr ? letterToColumn(startColStr.toUpperCase()) : 0;
  const startRow = startRowStr ? parseInt(startRowStr, 10) - 1 : 0;
  const endCol = endColStr
    ? letterToColumn(endColStr.toUpperCase())
    : startColStr
      ? startCol
      : 25;
  const endRow = endRowStr
    ? parseInt(endRowStr, 10) - 1
    : startRowStr
      ? startRow
      : 999;

  return { startRow, startCol, endRow, endCol };
}
