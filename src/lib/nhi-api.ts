import axios from "axios";
import { parseCsvBuffer } from "./csv-parser";

const NHI_API_BASE = process.env.NHI_API_BASE || "https://info.nhi.gov.tw";
const DRUG_RESOURCE_ID =
  process.env.NHI_DRUG_RESOURCE_ID || "A21030000I-E41001-001";
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
  regulationUrl: string | null;
}

export interface DeviceData {
  code: string;
  name: string;
  category: string | null;
  price: number;
  selfPay: number;
  unit: string | null;
  startDate: string | null;
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
/**
 * 解析 PAYCODE_URL_LIST，提取第一個給付規定連結
 * 格式可能是 JSON array 或逗號分隔的 URL 字串
 */
function parseRegulationUrl(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0]?.URL || parsed[0] || null;
    }
  } catch {
    // 非 JSON，可能是純 URL 字串
  }
  // 可能是逗號分隔的多個 URL，取第一個
  const trimmed = raw.trim();
  if (trimmed.startsWith("http")) {
    const firstUrl = trimmed.split(",")[0].trim();
    return firstUrl || null;
  }
  return null;
}

function mapDrugRecord(raw: NhiDrugRaw): DrugData {
  return {
    code: raw.PAY_CODE || "",  // 健保給付代碼
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
    regulationUrl: parseRegulationUrl(raw.PAYCODE_URL_LIST),
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

// ===== 特材品項 API =====

interface NhiDeviceRaw {
  meT_CODE: string;
  name: string;
  model: string | null;
  unit: string;
  price: string;
  n_EFFECTIVE_DATE: string;       // 民國年 "YYY.MM.DD"
  effectivE_END_DATE: string;     // ISO "2910-12-31T00:00:00"
  examine: string;
  memO_CODE: string;
  druggist: string;               // 代理商
  factory: string;                // 廠牌
  catA_CODE: string | null;       // 功能分類碼
  speC_TABLE: string | null;
}

/**
 * 民國年 "YYY.MM.DD" 轉 ISO 8601
 */
function rocDotDateToIso(rocDate: string): string | null {
  if (!rocDate || !rocDate.includes(".")) return null;
  const parts = rocDate.split(".");
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10) + 1911;
  return `${year}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
}

/**
 * 從特材代碼前綴推斷科別
 */
function classifyDevice(code: string, name: string): string | null {
  if (!code && !name) return null;
  const n = name || "";
  if (/髖|膝|骨|脊椎|椎間|鋼釘|鋼板|關節/.test(n)) return "骨科";
  if (/水晶體|眼內/.test(n)) return "眼科";
  if (/支架|節律器|導管|瓣膜|心/.test(n)) return "心臟內科";
  if (/牙|齒/.test(n)) return "牙科";
  if (/耳|人工電子耳/.test(n)) return "耳鼻喉科";
  if (/腦|顱|神經/.test(n)) return "神經外科";
  if (/呼吸|氣管/.test(n)) return "胸腔科";
  if (/血管|靜脈/.test(n)) return "血管外科";
  if (/傷口|敷料|止血/.test(n)) return "一般外科";
  return "其他";
}

/**
 * 抓取特材品項（分頁，從健保署 INAE2000 API）
 */
export async function fetchDevices(
  page = 1,
  pageSize = 5000
): Promise<{ records: NhiDeviceRaw[]; total: number }> {
  const url = `${NHI_API_BASE}/api/INAE2000/INAE2000S01/SQL0001`;

  const response = await rateLimitedRequest(() =>
    axios.post(url, {
      MET_CODE: "", NAME: "", MODEL: "", UNIT: "",
      FACTORY: "", PRICE: "", EXAMINE: "",
      EFFECTIVE_DATE_YY: "", EFFECTIVE_DATE_MM: "",
      MEMO_CODE: "", DRUGGIST: "", APPLYNO: "",
      SHOWTYPE: "", CURPAGE: page, PAGESIZE: pageSize,
    })
  );

  return {
    records: response.data?.data || [],
    total: response.data?.total || 0,
  };
}

/**
 * 抓取所有有效特材品項（自動分頁 + 過濾 + 去重）
 */
export async function fetchAllDevices(): Promise<DeviceData[]> {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  const deviceMap = new Map<string, DeviceData>();
  let page = 1;
  const pageSize = 5000;

  while (true) {
    const { records } = await fetchDevices(page, pageSize);
    if (records.length === 0) break;

    for (const raw of records) {
      // 只保留目前有效的品項（endDate 在今天之後）
      const endDate = raw.effectivE_END_DATE?.split("T")[0] || "";
      if (endDate && endDate < today) continue;

      const code = raw.meT_CODE;
      if (!code) continue;

      // 同 code 保留最新的（後面覆蓋前面）
      const price = parseFloat(raw.price) || 0;
      deviceMap.set(code, {
        code,
        name: raw.name || "",
        category: classifyDevice(code, raw.name),
        price,
        selfPay: 0,  // API 沒有差額負擔欄位，預設 0
        unit: raw.unit || null,
        startDate: rocDotDateToIso(raw.n_EFFECTIVE_DATE),
      });
    }

    if (records.length < pageSize) break;
    page++;
  }

  return Array.from(deviceMap.values());
}

/**
 * 從中文項目名稱推斷分類
 */
function classifyPayment(name: string): string | null {
  if (!name) return null;
  if (/診察費/.test(name)) return "診察費";
  if (/藥事服務費|藥費/.test(name)) return "藥事服務費";
  if (/護理費|照護/.test(name)) return "護理費";
  if (/檢驗/.test(name)) return "檢驗費";
  if (/檢查|超音波|X光|攝影/.test(name)) return "檢查費";
  if (/處置|治療/.test(name)) return "處置費";
  if (/手術/.test(name)) return "手術費";
  if (/麻醉/.test(name)) return "麻醉費";
  if (/材料|特材/.test(name)) return "材料費";
  if (/注射|輸液/.test(name)) return "注射費";
  if (/復健|物理治療|職能治療/.test(name)) return "復健費";
  if (/精神|心理/.test(name)) return "精神醫療";
  if (/牙|齒/.test(name)) return "牙科";
  if (/中醫|針灸/.test(name)) return "中醫";
  if (/放射|放療/.test(name)) return "放射治療";
  if (/病房|住院/.test(name)) return "住院費";
  return "其他";
}

/**
 * 下載並解析支付標準 CSV（使用健保署開放資料 API）
 */
export async function fetchPayments(): Promise<PaymentData[]> {
  // 使用正確的 resource download API
  const PAYMENT_RESOURCE_ID = "A21030000I-D20021-001";
  const url = `${NHI_API_BASE}/api/iode0000s01/Dataset?rId=${PAYMENT_RESOURCE_ID}`;

  const response = await rateLimitedRequest(() =>
    axios.get(url, { responseType: "arraybuffer" })
  );

  const buffer = Buffer.from(response.data);
  const records = parseCsvBuffer(buffer);

  return records
    .map((row) => {
      const code = row["診療項目代碼"] || row["診療代碼"] || row["代碼"] || "";
      const name = row["中文項目名稱"] || row["項目名稱"] || row["名稱"] || "";
      const priceStr = row["健保支付點數"] || row["支付點數"] || row["點數"] || "0";
      const startDateRaw = row["生效起日"] || row["生效日期"] || "";

      // 生效日可能是民國或西元格式
      let startDate: string | null = null;
      if (startDateRaw.length === 8 && !startDateRaw.includes("-")) {
        // YYYYMMDD 格式
        startDate = `${startDateRaw.slice(0, 4)}-${startDateRaw.slice(4, 6)}-${startDateRaw.slice(6, 8)}`;
      } else if (startDateRaw) {
        startDate = startDateRaw;
      }

      return {
        code,
        name,
        category: classifyPayment(name),
        price: parseFloat(priceStr) || 0,
        unit: null,
        startDate,
      };
    })
    .filter((p) => p.code && p.name);
}
