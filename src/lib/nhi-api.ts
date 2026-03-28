import axios from "axios";
import { parseCsvBuffer } from "./csv-parser";

const NHI_API_BASE = process.env.NHI_API_BASE || "https://info.nhi.gov.tw";
const DRUG_RESOURCE_ID =
  process.env.NHI_DRUG_RESOURCE_ID || "A21030000I-E41001-001";
const PAYMENT_CSV_ID = process.env.NHI_PAYMENT_CSV_ID || "1381";

// Rate limit: 每次請求間隔至少 1 秒
const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

async function rateLimitedRequest<T>(
  requestFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return requestFn();
}

// ===== 健保署 API 欄位映射 =====

interface NhiDrugRaw {
  Q1_ID: string;        // 查驗登記號（非健保碼）
  PAY_CODE: string;     // 給付代碼
  NAME: string;         // 英文品名
  EXPR1: string;        // 中文品名
  CLASSGROUPNAME: string; // 學名群組
  PRICE: string;        // 健保價
  STAND_UNIT: string;   // 計價單位
  ATC_CODE: string;     // ATC 碼
  FIRM_NAME: string;    // 製造商
  DRUG_FORM: string;    // 劑型
  DRUG_CLASSIFY_NAME: string; // 藥品分類
  DRUG_GROUP_NAME: string;    // 藥品群組（含規格含量）
  START_DATE: string;   // 生效日（民國年 YYYMMDD）
  END_DATE: string;     // 終止日
  MIXTURE: string;      // 單複方
  IS_UPDATE: string;    // 更新標誌
  SALES: string;        // 銷售公司
  FDA_URL: string;      // 食藥署連結
  PAYCODE_URL_LIST: string; // 給付規定連結
}

export interface DrugData {
  code: string;
  name: string;
  generic: string | null;
  form: string | null;
  strength: string | null;
  price: number;
  unit: string | null;
  atcCode: string | null;
  manufacturer: string | null;
  category: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface PaymentData {
  code: string;
  name: string;
  category: string | null;
  price: number;
  unit: string | null;
  startDate: string | null;
}

/**
 * 民國年日期 (YYYMMDD) 轉 ISO 8601 (YYYY-MM-DD)
 */
function rocDateToIso(rocDate: string): string | null {
  if (!rocDate || rocDate.length < 5) return null;
  // 可能是 6 碼 (YYYMMDD 如 951101) 或 7 碼 (1131101)
  let year: number, month: string, day: string;

  if (rocDate.length === 7) {
    year = parseInt(rocDate.substring(0, 3), 10) + 1911;
    month = rocDate.substring(3, 5);
    day = rocDate.substring(5, 7);
  } else if (rocDate.length === 6) {
    year = parseInt(rocDate.substring(0, 2), 10) + 1911;
    month = rocDate.substring(2, 4);
    day = rocDate.substring(4, 6);
  } else {
    return null;
  }

  return `${year}-${month}-${day}`;
}

/**
 * 從藥品群組名稱中提取規格含量
 * 例："SULPIRIDE , 一般錠劑膠囊劑 , 100.00 MG" → "100.00 MG"
 */
function extractStrength(groupName: string): string | null {
  if (!groupName) return null;
  const parts = groupName.split(",").map((s) => s.trim());
  return parts.length >= 3 ? parts[parts.length - 1] : null;
}

/**
 * 從學名群組中提取學名
 * 例："SULPIRIDE 100 MG" → "SULPIRIDE"
 */
function extractGeneric(classGroupName: string): string | null {
  if (!classGroupName) return null;
  // 移除劑量數字部分
  return classGroupName.replace(/\s+\d+[\d.]*\s*(MG|GM|ML|MCG|IU|%|UNIT).*$/i, "").trim() || null;
}

/**
 * 判斷藥品類別（口服/注射/外用）
 */
function classifyDrugForm(form: string): string | null {
  if (!form) return null;
  if (/錠|膠囊|顆粒|口服|散劑|糖漿|液劑/.test(form)) return "口服";
  if (/注射|針/.test(form)) return "注射";
  if (/外用|軟膏|乳膏|凝膠|貼片|噴霧|眼|耳|鼻/.test(form)) return "外用";
  return "其他";
}

/**
 * 將 API 原始資料轉換為 DrugData
 */
function mapDrugRecord(raw: NhiDrugRaw): DrugData {
  return {
    code: raw.Q1_ID || "",
    name: raw.NAME || "",
    generic: extractGeneric(raw.CLASSGROUPNAME),
    form: raw.DRUG_FORM || null,
    strength: extractStrength(raw.DRUG_GROUP_NAME),
    price: parseFloat(raw.PRICE) || 0,
    unit: raw.STAND_UNIT || null,
    atcCode: raw.ATC_CODE || null,
    manufacturer: raw.FIRM_NAME || null,
    category: classifyDrugForm(raw.DRUG_FORM),
    startDate: rocDateToIso(raw.START_DATE),
    endDate: rocDateToIso(raw.END_DATE),
  };
}

// ===== 公開 API =====

/**
 * 抓取藥品品項資料（分頁）
 */
export async function fetchDrugs(
  limit = 1000,
  offset = 0
): Promise<{ records: DrugData[]; total: number }> {
  const url = `${NHI_API_BASE}/api/iode0010/v1/rest/datastore/${DRUG_RESOURCE_ID}`;

  const response = await rateLimitedRequest(() =>
    axios.get(url, { params: { limit, offset } })
  );

  const result = response.data?.result;
  if (!result || !result.records) {
    return { records: [], total: 0 };
  }

  const records = (result.records as NhiDrugRaw[]).map(mapDrugRecord);
  // API total 可能回傳 0，用 records 長度判斷是否還有下一頁
  const total = result.total || records.length;

  return { records, total };
}

/**
 * 抓取所有藥品品項（自動分頁）
 */
export async function fetchAllDrugs(): Promise<DrugData[]> {
  const allRecords: DrugData[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { records } = await fetchDrugs(limit, offset);
    if (records.length === 0) break;

    allRecords.push(...records);
    offset += limit;

    // 如果回傳筆數少於 limit，表示已到最後一頁
    if (records.length < limit) break;
  }

  return allRecords;
}

/**
 * 下載並解析支付標準 CSV
 */
export async function fetchPayments(): Promise<PaymentData[]> {
  const url = `${NHI_API_BASE}/IODE0000/IODE0000S09?id=${PAYMENT_CSV_ID}`;

  const response = await rateLimitedRequest(() =>
    axios.get(url, { responseType: "arraybuffer" })
  );

  const buffer = Buffer.from(response.data);
  const records = parseCsvBuffer(buffer);

  return records.map((row) => ({
    code: row["診療代碼"] || row["代碼"] || row["col0"] || "",
    name: row["項目名稱"] || row["名稱"] || row["col1"] || "",
    category: row["分類"] || row["col2"] || null,
    price: parseFloat(row["支付點數"] || row["點數"] || row["col3"] || "0") || 0,
    unit: row["單位"] || null,
    startDate: row["生效日期"] || null,
  }));
}
