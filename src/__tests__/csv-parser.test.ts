import { describe, it, expect } from "vitest";
import { parseCsvBuffer, parseCsvText } from "@/lib/csv-parser";
import * as iconv from "iconv-lite";

describe("parseCsvBuffer", () => {
  it("解析基本 UTF-8 CSV", () => {
    const csv = "代碼,名稱,價格\nA001,阿斯匹靈,1.87\nA002,立普妥,26.40";
    const buffer = Buffer.from(csv, "utf-8");
    const result = parseCsvBuffer(buffer);

    expect(result).toHaveLength(2);
    expect(result[0]["代碼"]).toBe("A001");
    expect(result[0]["名稱"]).toBe("阿斯匹靈");
    expect(result[0]["價格"]).toBe("1.87");
    expect(result[1]["代碼"]).toBe("A002");
  });

  it("處理 BOM 標記", () => {
    const csv = "\ufeff代碼,名稱\nA001,測試";
    const buffer = Buffer.from(csv, "utf-8");
    const result = parseCsvBuffer(buffer);

    expect(result).toHaveLength(1);
    expect(result[0]["代碼"]).toBe("A001");
  });

  it("處理引號包圍的欄位", () => {
    const csv = '代碼,名稱,備註\nA001,"含逗號,的品名",正常\nA002,"含""引號""的",正常';
    const buffer = Buffer.from(csv, "utf-8");
    const result = parseCsvBuffer(buffer);

    expect(result).toHaveLength(2);
    expect(result[0]["名稱"]).toBe("含逗號,的品名");
    expect(result[1]["名稱"]).toBe('含"引號"的');
  });

  it("處理空資料", () => {
    const buffer = Buffer.from("", "utf-8");
    const result = parseCsvBuffer(buffer);
    expect(result).toHaveLength(0);
  });

  it("只有表頭無資料", () => {
    const csv = "代碼,名稱,價格";
    const buffer = Buffer.from(csv, "utf-8");
    const result = parseCsvBuffer(buffer);
    expect(result).toHaveLength(0);
  });

  it("無表頭模式", () => {
    const csv = "A001,阿斯匹靈,1.87";
    const buffer = Buffer.from(csv, "utf-8");
    const result = parseCsvBuffer(buffer, { hasHeader: false });

    expect(result).toHaveLength(1);
    expect(result[0]["col0"]).toBe("A001");
    expect(result[0]["col1"]).toBe("阿斯匹靈");
  });

  it("處理 Big5 編碼（長文本才能正確偵測）", () => {
    // chardet 需要足夠長的 Big5 文本才能正確辨識編碼
    const rows = Array.from({ length: 20 }, (_, i) =>
      `A${String(i).padStart(3, "0")},阿斯匹靈錠劑一百毫克中國化學製藥`
    );
    const csv = "代碼,名稱\n" + rows.join("\n");
    const buffer = iconv.encode(csv, "big5");
    const result = parseCsvBuffer(buffer);

    expect(result).toHaveLength(20);
    expect(result[0]["代碼"]).toBe("A000");
    expect(result[0]["名稱"]).toContain("阿斯匹靈");
  });

  it("處理超長品名", () => {
    const longName = "A".repeat(500);
    const csv = `代碼,名稱\nA001,${longName}`;
    const buffer = Buffer.from(csv, "utf-8");
    const result = parseCsvBuffer(buffer);

    expect(result).toHaveLength(1);
    expect(result[0]["名稱"]).toBe(longName);
  });

  it("處理 CRLF 換行", () => {
    const csv = "代碼,名稱\r\nA001,測試\r\nA002,測試2";
    const buffer = Buffer.from(csv, "utf-8");
    const result = parseCsvBuffer(buffer);
    expect(result).toHaveLength(2);
  });
});

describe("parseCsvText", () => {
  it("解析 CSV 文字字串", () => {
    const result = parseCsvText("代碼,名稱\nA001,測試");
    expect(result).toHaveLength(1);
    expect(result[0]["代碼"]).toBe("A001");
  });
});
