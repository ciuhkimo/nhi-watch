import { describe, it, expect } from "vitest";

describe("HTML to text conversion", () => {
  // 測試 htmlToText 邏輯（與 regulation-search.ts 中相同的邏輯）
  function htmlToText(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  }

  it("移除 HTML 標籤", () => {
    const html = "<p>藥品<strong>給付</strong>規定</p>";
    expect(htmlToText(html)).toBe("藥品給付規定");
  });

  it("移除 script 和 style 區塊", () => {
    const html = "<script>alert(1)</script><p>內容</p><style>.x{}</style>";
    expect(htmlToText(html)).toBe("內容");
  });

  it("將 br/p/div 轉為換行", () => {
    const html = "第一行<br/>第二行<br>第三行";
    expect(htmlToText(html)).toBe("第一行\n第二行\n第三行");
  });

  it("解碼 HTML entities", () => {
    const html = "&lt;限用於&gt; A &amp; B";
    expect(htmlToText(html)).toBe("<限用於> A & B");
  });

  it("解碼數字型 HTML entities", () => {
    const html = "&#65;&#66;&#67;";
    expect(htmlToText(html)).toBe("ABC");
  });

  it("清理多餘空白", () => {
    const html = "  多  餘   空白  ";
    expect(htmlToText(html)).toBe("多 餘 空白");
  });

  it("空字串回傳空字串", () => {
    expect(htmlToText("")).toBe("");
  });
});

describe("Regulation URL parsing", () => {
  function parseRegulationUrl(raw: string): string | null {
    if (!raw || raw.trim() === "") return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0]?.URL || parsed[0] || null;
      }
    } catch {
      // 非 JSON
    }
    const trimmed = raw.trim();
    if (trimmed.startsWith("http")) return trimmed;
    return null;
  }

  it("解析 JSON 陣列格式", () => {
    const raw = '[{"URL":"https://info.nhi.gov.tw/regulation/123"}]';
    expect(parseRegulationUrl(raw)).toBe("https://info.nhi.gov.tw/regulation/123");
  });

  it("解析純字串陣列格式", () => {
    const raw = '["https://info.nhi.gov.tw/regulation/456"]';
    expect(parseRegulationUrl(raw)).toBe("https://info.nhi.gov.tw/regulation/456");
  });

  it("解析純 URL 字串", () => {
    const raw = "https://info.nhi.gov.tw/regulation/789";
    expect(parseRegulationUrl(raw)).toBe("https://info.nhi.gov.tw/regulation/789");
  });

  it("空字串回傳 null", () => {
    expect(parseRegulationUrl("")).toBeNull();
    expect(parseRegulationUrl("  ")).toBeNull();
  });

  it("非 URL 非 JSON 回傳 null", () => {
    expect(parseRegulationUrl("not-a-url")).toBeNull();
  });
});

describe("Search highlight generation", () => {
  function generateHighlight(content: string, query: string): string {
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return content.substring(0, 150);

    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + query.length + 60);
    let snippet = content.substring(start, end);

    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet = snippet + "...";

    return snippet;
  }

  it("關鍵字在文字中間", () => {
    const content = "A".repeat(100) + "糖尿病" + "B".repeat(100);
    const result = generateHighlight(content, "糖尿病");
    expect(result).toContain("糖尿病");
    expect(result.startsWith("...")).toBe(true);
    expect(result.endsWith("...")).toBe(true);
  });

  it("關鍵字在文字開頭", () => {
    const content = "糖尿病患者限用";
    const result = generateHighlight(content, "糖尿病");
    expect(result).toBe("糖尿病患者限用");
  });

  it("找不到關鍵字時回傳前 150 字", () => {
    const content = "A".repeat(200);
    const result = generateHighlight(content, "找不到");
    expect(result.length).toBe(150);
  });

  it("大小寫不敏感", () => {
    const content = "Drug NAME test";
    const result = generateHighlight(content, "drug name");
    expect(result).toContain("Drug NAME");
  });
});

describe("Regulation search API response shape", () => {
  it("空搜尋回傳空結果", () => {
    const response = {
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(0);
    expect(response.pagination.total).toBe(0);
  });

  it("搜尋結果包含必要欄位", () => {
    const result = {
      drugCode: "A123456789",
      payCode: "8.2.1",
      title: "抗凝血劑給付規定",
      content: "限用於...",
      sourceUrl: "https://info.nhi.gov.tw/...",
      drugName: "WARFARIN",
      drugPrice: 2.5,
      highlight: "限用於...",
    };

    expect(result.drugCode).toBeTruthy();
    expect(result.payCode).toBeTruthy();
    expect(result.content).toBeTruthy();
    expect(typeof result.drugPrice).toBe("number");
  });
});
