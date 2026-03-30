# NHI-Watch 健保給付查詢儀表板

恆春旅遊醫院內部使用的健保給付查詢系統，每日自動同步健保署開放資料，提供藥品、特材、診療支付標準的查詢與異動追蹤。

## 技術棧

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **資料庫**: Prisma + SQLite (開發) / PostgreSQL (生產)
- **排程**: node-cron（每日 07:00 同步、07:30 推播摘要）
- **推播**: LINE Notify 異動通知
- **CSV 解析**: iconv-lite + chardet（Big5/UTF-8 自動偵測）

## 快速開始

```bash
# 安裝依賴
npm install

# 複製環境變數並填入設定
cp .env.example .env

# 初始化資料庫
npx prisma migrate dev

# 啟動開發伺服器
npm run dev
```

瀏覽器開啟 http://localhost:3000

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DATABASE_URL` | 資料庫連線字串 | `file:./dev.db` |
| `SYNC_SECRET` | /api/sync API key（Bearer token） | — |
| `LINE_NOTIFY_TOKEN` | LINE Notify 推播 token | — |
| `SYNC_CRON` | 同步排程（cron 格式） | `0 7 * * *` |
| `SUMMARY_CRON` | 每日摘要推播排程 | `30 7 * * *` |
| `NHI_API_BASE` | 健保署 API 網址 | `https://info.nhi.gov.tw` |
| `NHI_DRUG_RESOURCE_ID` | 藥品品項 Resource ID | `A21030000I-E41001-001` |
| `NHI_PAYMENT_CSV_ID` | 支付標準 CSV ID | `1381` |

## 常用指令

```bash
npm run dev                        # 開發伺服器
npm run build                      # 建置生產版本
npm test                           # 執行測試 (vitest)
npm run lint                       # ESLint 檢查
npx prisma migrate dev             # 執行 DB migration
npx prisma studio                  # 開啟資料庫 GUI
npx tsx scripts/sync-daily.ts      # 手動執行同步
npx tsx scripts/cron-scheduler.ts  # 啟動排程器
```

## 資料流

```
健保署 API/CSV → sync-engine（比對 + upsert）→ Prisma/DB → API Routes → React 前端
                      ↓
              diff-detector（異動偵測）→ changes_log → LINE Notify 推播
```

## API 端點

所有 API 回傳統一格式 `{ success, data, pagination }`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/drugs?search=&category=&status=&page=&limit=` | 藥品全欄位模糊搜尋 | — |
| GET | `/api/drugs/[code]/price-history` | 藥品歷史藥價（趨勢圖） | — |
| GET | `/api/drugs/[code]/regulation` | 單一藥品給付規定 | — |
| GET | `/api/devices?search=&category=` | 特材搜尋 | — |
| GET | `/api/payments?search=&category=` | 診療支付搜尋 | — |
| GET | `/api/changes?type=&from=&to=` | 異動紀錄（按日期分組） | — |
| GET | `/api/stats` | 儀表板統計數據 | — |
| GET | `/api/regulations/search?q=&page=&limit=` | 給付規定全文搜尋 | — |
| POST | `/api/sync` | 手動觸發同步 | Bearer token |

### 同步 API 認證

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer <SYNC_SECRET>"
```

## 資料模型

| 表格 | 說明 |
|------|------|
| `Drug` | 藥品給付（代碼、品名、學名、藥價、ATC碼、製造商） |
| `Device` | 特材給付（代碼、品名、科別、給付價、差額負擔） |
| `Payment` | 診療支付標準（代碼、項目名、分類、支付點數） |
| `ChangeLog` | 異動紀錄（自動偵測新增/調價/停用） |
| `SyncLog` | 同步紀錄（成功/失敗、筆數、時間） |
| `PriceHistory` | 藥價歷史（趨勢圖用，`drugCode + date` 唯一） |
| `DrugRegulation` | 給付規定全文（搜尋用） |
| `DrugMapping` | 院內藥碼對照（HIS 介接預留） |

## 頁面

| 路徑 | 說明 |
|------|------|
| `/` | 總覽儀表板（統計卡片 + 近期異動 + 同步狀態） |
| `/drugs` | 藥品查詢（表格 + 藥價趨勢圖 + 給付規定） |
| `/devices` | 特材查詢（卡片式排版） |
| `/payments` | 診療支付（分類篩選） |
| `/changes` | 異動紀錄（時間軸，綠新增/橘調價/紅停用） |
| `/regulations` | 給付規定全文搜尋 |

## 核心模組 (`src/lib/`)

| 模組 | 說明 |
|------|------|
| `sync-engine.ts` | 同步引擎：批次 upsert（500/batch `$transaction`）+ diff 偵測 |
| `diff-detector.ts` | 異動偵測：比對新舊資料，判斷新增/調價/停用 |
| `nhi-api.ts` | 健保署 API 串接（藥品 JSON + 支付標準 CSV） |
| `csv-parser.ts` | CSV 解析，自動偵測 Big5/UTF-8 編碼 |
| `notify.ts` | LINE Notify 推播（即時異動 + 每日摘要） |
| `regulation-search.ts` | 給付規定抓取、解析、全文搜尋 |
| `db.ts` | Prisma 單例連線 |

## 注意事項

- 健保署 API 有 rate limit，每次請求間隔至少 **1 秒**
- CSV 編碼可能是 Big5 或 UTF-8，已用 chardet 自動偵測
- 藥品代碼格式：英文字母 + 數字，共 10 碼
- 金額單位：新台幣（元）；診療支付單位：點
- 日期格式統一 ISO 8601（YYYY-MM-DD），時區 Asia/Taipei
