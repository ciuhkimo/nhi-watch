# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述
恆春旅遊醫院內部使用的健保給付查詢儀表板（NHI-Watch），每日自動同步健保署開放資料，
提供藥品、特材、診療支付標準的查詢與異動追蹤。目前處於 Phase 2 開發階段。

## 技術棧
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (開發) / PostgreSQL (生產)
- node-cron 排程 + LINE Notify 推播
- CSV 解析：iconv-lite + chardet（Big5/UTF-8 自動偵測）

## 常用指令
```bash
npm run dev                        # 啟動開發伺服器
npm run build                      # 建置生產版本
npm test                           # 執行測試
npx prisma migrate dev             # 執行資料庫 migration
npx prisma studio                  # 開啟資料庫 GUI
npx tsx scripts/sync-daily.ts      # 手動執行同步
```

## 程式碼風格
- ES modules (import/export)
- React functional component + hooks
- API routes 使用 Next.js Route Handlers
- **UI 文字一律繁體中文**，變數/函式名稱英文 camelCase
- 註解可使用中文

## 架構概覽

### 資料流
```
健保署 API/CSV → sync-engine（比對+upsert）→ Prisma/DB → API Routes → React 前端
                      ↓
              diff-detector（異動偵測）→ changes_log → LINE Notify 推播
```

### 核心模組（src/lib/）
- `db.ts` — Prisma 單例連線
- `nhi-api.ts` — 健保署 API 串接（藥品 JSON + 支付標準 CSV 下載）
- `sync-engine.ts` — 同步引擎：批次 upsert + 呼叫 diff-detector
- `diff-detector.ts` — 異動偵測：比對新舊資料，判斷新增/調價/停用
- `csv-parser.ts` — CSV 解析，自動偵測 Big5/UTF-8 編碼
- `notify.ts` — LINE Notify：即時異動推播 + 每日 07:30 摘要
- `regulation-search.ts` — 給付規定抓取、解析、全文搜尋

### API 端點（src/app/api/）
所有 API 回傳統一格式 `{ success, data, pagination: { page, limit, total, totalPages } }`

| 路由 | 說明 |
|------|------|
| GET `/api/drugs?search=&category=&status=&page=&limit=` | 藥品全欄位模糊搜尋（健保碼優先） |
| GET `/api/devices?search=&category=` | 特材搜尋 |
| GET `/api/payments?search=&category=` | 診療搜尋（分類從 DB 動態產生） |
| GET `/api/changes?type=&from=&to=` | 異動紀錄（按日期分組） |
| GET `/api/stats` | 儀表板統計卡片數據 |
| POST `/api/sync` | 手動觸發同步 |
| GET `/api/drugs/[code]/price-history` | 藥品歷史藥價（趨勢圖用） |
| GET `/api/drugs/[code]/regulation` | 單一藥品給付規定 |
| GET `/api/regulations/search?q=&page=&limit=` | 給付規定全文搜尋 |

### 頁面（src/app/）
- `/` — 總覽儀表板（4 張 StatCard + 近期異動時間軸 + 同步狀態）
- `/drugs` — 藥品查詢（表格 + 可展開詳情 + 藥價趨勢圖 + 給付規定連結）
- `/devices` — 特材查詢（卡片式排版，健保價藍色 vs 差額負擔橘色）
- `/payments` — 診療支付（分類篩選按鈕群組）
- `/changes` — 異動紀錄（按日期分組時間軸，綠新增/橘調價/紅停用）
- `/regulations` — 給付規定全文搜尋（關鍵字高亮 + 展開全文）

### 資料庫核心表格
- `drugs` — 藥品給付（代碼、品名、學名、藥價、ATC碼、製造商）
- `devices` — 特材給付（代碼、品名、科別、給付價、差額負擔）
- `payments` — 診療支付標準（代碼、項目名、分類、支付點數）
- `changes_log` — 異動紀錄（自動偵測新增/調價/停用）
- `sync_log` — 同步紀錄（成功/失敗、筆數、時間）
- `drug_mapping` — 院內藥碼對照（Phase 2.0 HIS 介接用，目前僅預留）

## 資料來源
- 健保署 API base: `https://info.nhi.gov.tw`（無需 API key，rate limit 間隔 ≥ 1 秒）
- 藥品品項 Resource ID: `A21030000I-E41001-001`
- 支付標準 CSV: `https://info.nhi.gov.tw/IODE0000/IODE0000S09?id=1381`
- 支付標準 TXT: `https://info.nhi.gov.tw/IODE0000/IODE0000S09?id=1380`
- API 規格: `https://info.nhi.gov.tw/IODE0000/openapi.json`

## 重要約束
- 健保署 API 有 rate limit，每次請求間隔**至少 1 秒**
- CSV 編碼可能是 Big5 或 UTF-8，必須用 chardet 自動偵測
- 藥品代碼格式：英文字母 + 數字，共 10 碼
- 金額單位：新台幣（元）；診療支付單位：點
- 日期格式統一 ISO 8601 (YYYY-MM-DD)
- 排程：每日 07:00 同步、07:30 推播摘要

## UI 設計規範
- 色彩：藍主色(blue-600)、綠新增(emerald-500)、橘調價(amber-500)、紅停用(rose-500)、紫差額(violet-500)
- 佈局：側邊欄 240px（桌面）/ 漢堡選單（手機），內容區最大 1280px
- RWD 斷點：手機 <640px、平板 640-1024px、桌面 >1024px
- 視覺參考：`nhi-watch-prototype.jsx`

## 環境變數（.env）
```env
DATABASE_URL="file:./dev.db"
LINE_NOTIFY_TOKEN="your-token-here"
SYNC_CRON="0 7 * * *"
SUMMARY_CRON="30 7 * * *"
NHI_API_BASE="https://info.nhi.gov.tw"
NHI_DRUG_RESOURCE_ID="A21030000I-E41001-001"
NHI_PAYMENT_CSV_ID="1381"
```

## 開發流程
- 每個功能用一個獨立 Claude Code session 開發
- 完成一個功能就 git commit
- 使用 feature branch，完成後 PR merge 到 main
- 參考 SPEC.md 了解完整功能規格
- 參考 HANDOVER.md 了解 10 session 開發計劃與順序

## 關鍵參考文件
- `SPEC.md` — 完整功能規格書（API 設計、DB schema、UI 規格）
- `HANDOVER.md` — Phase 1→2 交接文件（開發順序、注意事項）
- `nhi-project-plan.md` — 全端專案規劃
- `nhi-watch-prototype.jsx` — UI 原型（React，含 mock 資料與完整視覺設計）
