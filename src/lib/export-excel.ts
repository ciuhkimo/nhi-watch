import * as XLSX from "xlsx";

/**
 * 將資料匯出為 Excel 並下載
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[],
  filename: string
) {
  // 建立表頭對應資料
  const rows = data.map((row) =>
    Object.fromEntries(columns.map((col) => [col.label, row[col.key] ?? ""]))
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "資料");

  // 設定欄寬
  ws["!cols"] = columns.map((col) => ({
    wch: Math.max(col.label.length * 2, 12),
  }));

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
