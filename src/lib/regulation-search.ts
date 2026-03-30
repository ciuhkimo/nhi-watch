import axios from "axios";
import { prisma } from "./db";

// Rate limit: 每次請求間隔至少 1 秒
const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

async function rateLimitedFetch<T>(requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return requestFn();
}

/**
 * 從 HTML 中提取純文字內容
 * 移除 HTML 標籤、script/style、多餘空白
 */
function htmlToText(html: string): string {
  return html
    // 移除 script/style 區塊
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // 將 <br>, <p>, <div>, <tr>, <li> 轉為換行
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    // 移除所有 HTML 標籤
    .replace(/<[^>]+>/g, "")
    // 解碼 HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // 清理多餘空白
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

/**
 * 從給付規定頁面 URL 擷取標題和內容
 */
export async function fetchRegulationContent(
  url: string
): Promise<{ title: string; content: string; payCode: string } | null> {
  try {
    const response = await rateLimitedFetch(() =>
      axios.get(url, {
        responseType: "text",
        timeout: 10000,
        headers: { "User-Agent": "NHI-Watch/1.2" },
      })
    );

    const html: string = response.data;
    if (!html || html.length < 100) return null;

    // 嘗試從 HTML 中提取標題
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? htmlToText(titleMatch[1]) : "";

    // 嘗試從 URL 提取給付代碼（章節編號）
    // URL 格式可能包含 payCode 參數
    const payCodeMatch = url.match(/[?&]payCode=([^&]+)/i) ||
      url.match(/[?&]code=([^&]+)/i) ||
      url.match(/\/(\d+(?:\.\d+)*)\/?$/);
    const payCode = payCodeMatch ? decodeURIComponent(payCodeMatch[1]) : "";

    // 提取主要內容區塊
    // 嘗試找到主要內容區域（常見 class: content, main, article）
    let contentHtml = html;
    const mainMatch =
      html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i) ||
      html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i) ||
      html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    if (mainMatch) {
      contentHtml = mainMatch[1];
    }

    const content = htmlToText(contentHtml);

    // 如果標題為空，取內容前 50 字作為標題
    if (!title) {
      title = content.substring(0, 50).replace(/\n/g, " ").trim();
      if (content.length > 50) title += "...";
    }

    return {
      title,
      content,
      payCode: payCode || "unknown",
    };
  } catch {
    return null;
  }
}

/**
 * 批次抓取並儲存藥品給付規定
 * 從 Drug 表中有 regulationUrl 的藥品，逐筆下載給付規定頁面
 */
export async function syncRegulations(options?: {
  limit?: number;
  forceUpdate?: boolean;
}): Promise<{ fetched: number; saved: number; errors: number }> {
  const { limit = 500, forceUpdate = false } = options || {};

  // 找出有 regulationUrl 的藥品
  const drugs = await prisma.drug.findMany({
    where: {
      regulationUrl: { not: null },
      ...(forceUpdate
        ? {}
        : {
            // 只抓尚未有給付規定的藥品
            NOT: {
              code: {
                in: (
                  await prisma.drugRegulation.findMany({
                    select: { drugCode: true },
                    distinct: ["drugCode"],
                  })
                ).map((r) => r.drugCode),
              },
            },
          }),
    },
    select: { code: true, regulationUrl: true },
    take: limit,
  });

  let fetched = 0;
  let saved = 0;
  let errors = 0;

  for (const drug of drugs) {
    if (!drug.regulationUrl) continue;

    const result = await fetchRegulationContent(drug.regulationUrl);
    fetched++;

    if (result && result.content.length > 10) {
      try {
        await prisma.drugRegulation.upsert({
          where: {
            drugCode_payCode: {
              drugCode: drug.code,
              payCode: result.payCode,
            },
          },
          update: {
            title: result.title,
            content: result.content,
            sourceUrl: drug.regulationUrl,
          },
          create: {
            drugCode: drug.code,
            payCode: result.payCode,
            title: result.title,
            content: result.content,
            sourceUrl: drug.regulationUrl,
          },
        });
        saved++;
      } catch {
        errors++;
      }
    } else {
      errors++;
    }

    // 每 50 筆印一次進度
    if (fetched % 50 === 0) {
      console.log(`給付規定同步進度：${fetched}/${drugs.length}（成功 ${saved}，失敗 ${errors}）`);
    }
  }

  return { fetched, saved, errors };
}

/**
 * 搜尋給付規定全文
 */
export async function searchRegulations(
  query: string,
  options?: { page?: number; limit?: number }
): Promise<{
  results: Array<{
    drugCode: string;
    payCode: string;
    title: string;
    content: string;
    sourceUrl: string | null;
    drugName: string;
    drugPrice: number;
    highlight: string;
  }>;
  total: number;
}> {
  const { page = 1, limit = 20 } = options || {};
  const offset = (page - 1) * limit;

  if (!query.trim()) {
    return { results: [], total: 0 };
  }

  // 使用 Prisma 的 contains 進行模糊搜尋
  // （SQLite 不支援原生 FTS5 via Prisma，用 contains 做基本全文搜尋）
  const where = {
    OR: [
      { content: { contains: query } },
      { title: { contains: query } },
      { payCode: { contains: query } },
    ],
  };

  const [regulations, total] = await Promise.all([
    prisma.drugRegulation.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.drugRegulation.count({ where }),
  ]);

  // 批次查詢對應的藥品名稱
  const drugCodes = Array.from(new Set(regulations.map((r) => r.drugCode)));
  const drugs = await prisma.drug.findMany({
    where: { code: { in: drugCodes } },
    select: { code: true, name: true, price: true },
  });
  const drugMap = new Map(drugs.map((d) => [d.code, d]));

  const results = regulations.map((reg) => {
    const drug = drugMap.get(reg.drugCode);
    // 產生搜尋結果摘要（含關鍵字前後文）
    const highlight = generateHighlight(reg.content, query);

    return {
      drugCode: reg.drugCode,
      payCode: reg.payCode,
      title: reg.title,
      content: reg.content,
      sourceUrl: reg.sourceUrl,
      drugName: drug?.name || "",
      drugPrice: drug?.price || 0,
      highlight,
    };
  });

  return { results, total };
}

/**
 * 產生搜尋結果摘要，顯示關鍵字前後文
 */
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
