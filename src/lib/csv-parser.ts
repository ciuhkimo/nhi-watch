import * as iconv from "iconv-lite";
import * as chardet from "chardet";

interface ParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
}

/**
 * 自動偵測編碼並解析 CSV buffer 為物件陣列
 * 支援 Big5 和 UTF-8 自動偵測
 */
export function parseCsvBuffer(
  buffer: Buffer,
  options: ParseOptions = {}
): Record<string, string>[] {
  const { delimiter = ",", hasHeader = true } = options;

  // 自動偵測編碼
  const detected = chardet.detect(buffer);
  const encoding = detected && /big5/i.test(detected) ? "big5" : "utf-8";
  let text = iconv.decode(buffer, encoding);

  // 移除 BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  if (!hasHeader) {
    return lines.map((line) => {
      const values = parseCsvLine(line, delimiter);
      const row: Record<string, string> = {};
      values.forEach((val, i) => {
        row[`col${i}`] = val;
      });
      return row;
    });
  }

  const headers = parseCsvLine(lines[0], delimiter);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] || "").trim();
    });
    records.push(row);
  }

  return records;
}

/**
 * 解析單行 CSV，處理引號包圍的欄位
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // 跳過轉義引號
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * 解析 CSV 文字字串（已知為 UTF-8）
 */
export function parseCsvText(
  text: string,
  options: ParseOptions = {}
): Record<string, string>[] {
  const buffer = Buffer.from(text, "utf-8");
  return parseCsvBuffer(buffer, options);
}
