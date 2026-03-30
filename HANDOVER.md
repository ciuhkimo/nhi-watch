# NHI-Watch 交接筆記（Handover Note）

> 從 Phase 1（Claude Project 原型設計）→ Phase 2（Claude Code 開發）  
> 日期：2026-03-28

---

## 一、Phase 1 已完成項目

| 項目 | 狀態 | 說明 |
|------|------|------|
| 需求訪談 | ✅ 完成 | 使用者涵蓋藥師、行政、管理層 |
| SPEC.md | ✅ 完成 | 完整功能規格書，含 API 設計、DB schema、UI 規格 |
| CLAUDE.md | ✅ 完成 | Claude Code 專案說明檔 |
| UI 原型 | ✅ 完成 | 互動式 React artifact（5 頁面全功能） |
| 資料庫 Schema | ✅ 完成 | Prisma schema，含 HIS 預留欄位 |
| HIS 介接方向 | ✅ 完成 | 部醫 HIS 系統分析，確認走 SiSDCP 拋轉平台 |
| nhi-project-plan.md | ✅ 完成 | 全端專案規劃文件 |

---

## 二、關鍵設計決策（已確認）

### 使用者需求
- **誰在用**：藥師（查藥價）、行政（查診療點數）、主管（看統計）→ 三者都要
- **裝置**：電腦 + 手機 → 全面 RWD
- **搜尋方式**：健保碼、中文品名、學名都常用 → 全欄位模糊搜尋 + 智慧排序
- **通知**：即時異動推播 + 每日 07:30 摘要 → 兩種都做（LINE Notify）

### 技術棧
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite（開發）/ PostgreSQL（生產）
- node-cron 排程 + LINE Notify 推播

### HIS 介接
- 院內使用**部醫 HIS 系統**（衛福部 19 家醫院共用）
- 相關模組：34.藥局系統、5/13.申報系統、23.ATC 稽核、61.雲端藥歷、66-69.SiSDCP
- **Phase 1 不實作**，僅預留 `hospitalCode` 欄位 + `DrugMapping` 表
- v2.0 透過 SiSDCP 拋轉平台正式串接
- NIS 護理資訊系統與本專案無直接關聯，暫不納入

---

## 三、需複製到本機的檔案

進入 Phase 2 前，將以下檔案放到專案根目錄：

```
nhi-watch/
├── CLAUDE.md              ← Claude Code 讀取的專案說明
├── SPEC.md                ← 功能規格書（本次產出）
├── nhi-project-plan.md    ← 全端專案規劃（參考用）
└── nhi-watch-prototype.jsx ← UI 原型（開發時的視覺參考）
```

---

## 四、Phase 2 開發順序（建議每個 Session 一個 commit）

| Session | 功能 | 預估 | 狀態 | 重點提醒 |
|---------|------|------|------|----------|
| **1** | 專案骨架 + Prisma schema + DB migration | 2hr | ✅ 完成 | `npx create-next-app`、貼入 SPEC.md 的 Prisma schema、`npx prisma migrate dev` |
| **2** | 健保署 API 串接 + CSV 解析器 | 3hr | ✅ 完成 | Big5/UTF-8 自動偵測（iconv-lite + chardet）、rate limit 間隔 1 秒、Resource ID: `A21030000I-E41001-001` |
| **3** | 藥品查詢頁面 | 3hr | ✅ 完成 | 全欄位模糊搜尋、排序、展開詳情、RWD 表格（手機隱藏學名/劑型） |
| **4** | 特材查詢頁面 | 2hr | ✅ 完成 | 卡片式排版、健保價（藍）vs 差額負擔（橘）突顯、科別按鈕篩選 |
| **5** | 診療支付頁面 | 2hr | ✅ 完成 | 分類篩選按鈕群組、分類從 DB 動態產生 |
| **6** | 異動偵測引擎 + 異動紀錄頁 | 3hr | ✅ 完成 | diff 比對邏輯（新增/調價/停用）、按日期分組時間軸 |
| **7** | 排程同步 + LINE Notify | 2hr | ✅ 完成 | node-cron 07:00 同步、07:30 摘要、即時異動推播 |
| **8** | 總覽儀表板 + 統計 API | 2hr | ✅ 完成 | 4 張 StatCard、近期異動、同步狀態面板 |
| **9** | 測試 + Bug 修復 | 3hr | ✅ 完成 | build 通過、所有頁面 + API 編譯成功 |
| **10** | 部署設定 | 2hr | ✅ 完成 | PM2 排程腳本、cron-scheduler.ts、環境變數文件 |

### Session 3 完成摘要（2026-03-29）
- `/drugs` 藥品查詢頁面：即時模糊搜尋（debounce 300ms）、分類/狀態篩選、表頭排序（健保碼/藥品名稱/健保價）、點擊展開詳情列、RWD 響應式表格（手機隱藏學名/劑型）、分頁導覽
- 匯出按鈕預留（disabled），v1.1 啟用

### Session 4 完成摘要（2026-03-29）
- `/devices` 特材查詢頁面：即時模糊搜尋、科別按鈕群組篩選（從資料動態產生）、卡片式排版（2 欄桌面/1 欄手機）、健保價藍色 vs 差額負擔橘色突顯、分頁
- 注意：TypeScript target 不支援 `[...new Set()]`，需用 `Array.from(new Set())`

### Session 5 完成摘要（2026-03-29）
- `/payments` 診療支付查詢頁面：即時模糊搜尋（代碼/項目名稱）、分類按鈕群組從 DB 動態產生、表格排版（代碼綠色 badge、分類手機隱藏、支付點數右對齊）、分頁
- 分類清單透過初次載入 100 筆資料提取不重複分類，獨立於搜尋/篩選邏輯

### Session 6 完成摘要（2026-03-29）
- `/changes` 異動紀錄頁面：類型篩選按鈕群組（全部/新增/調價/停用）、按日期分組時間軸、異動圖示（綠＋/橘△/紅✕）、來源標籤（藥品/特材/診療）、價格變動顯示
- diff-detector 已於 Session 2 完成（detectDrugChanges、detectPaymentChanges、saveChanges）

### Session 7 完成摘要（2026-03-29）
- `src/lib/notify.ts`：LINE Notify 推播模組（即時異動通知 + 每日摘要）
- `scripts/cron-scheduler.ts`：node-cron 排程（07:00 同步、07:30 摘要）
- 更新 `/api/sync` 支援全量同步（drugs + payments）+ 同步後自動推播
- 更新 `scripts/sync-daily.ts` 加入通知呼叫
- LINE_NOTIFY_TOKEN 未設定時靜默跳過，不影響其他功能

### Session 8 完成摘要（2026-03-29）
- `/` 總覽儀表板：4 張 StatCard（藥品/特材/診療/今日異動，左側漸層色條）、近期異動時間軸（5 筆）、同步狀態面板（上次同步時間/狀態/筆數/異動數）、手動同步按鈕（含 loading 動畫）
- 資料來源：`/api/stats` + `/api/changes?limit=5`

### Session 9-10 完成摘要（2026-03-29）
- `npm run build` 全部通過，5 個頁面 + 6 個 API 端點零錯誤
- 部署方式：`npx tsx scripts/cron-scheduler.ts` 啟動排程，或 `npx tsx scripts/sync-daily.ts` 手動同步
- 環境變數參考 `.env` 檔案，LINE_NOTIFY_TOKEN 需替換為實際 token

### Bug Fix 摘要（2026-03-29）
- **藥品停用判斷**：`endDate` 需早於今天才標停用（健保署用 `2910-12-31` 表示未終止）
- **支付標準同步**：原 CSV 下載 URL 已變為 SPA 頁面，改用開放資料 API（rId=A21030000I-D20021-001）
- **支付分類推斷**：新增 `classifyPayment()` 從中文項目名稱自動推斷 16 種分類
- **特材資料**：健保署無特材品項開放 API，新增 `scripts/seed-devices.ts` 寫入 25 筆常見特材示範資料

### 資料驗證結果（2026-03-29）
| 資料類型 | 筆數 | 來源 |
|----------|------|------|
| 藥品 | 39,716 | 健保署開放資料 API（自動同步） |
| 特材 | 22,816 | 健保署 INAE2000 API 爬蟲（自動同步） |
| 診療支付 | 6,221 | 健保署 CSV（自動同步） |

### v1.3 歷史藥價趨勢圖 完成摘要（2026-03-30）

#### 新增功能
- 藥品查詢頁展開詳情時顯示歷史藥價趨勢折線圖（recharts `stepAfter` 線型）
- 圖表使用 `next/dynamic` lazy loading，不影響初始載入效能

#### 新增檔案
| 檔案 | 說明 |
|------|------|
| `prisma/migrations/…add_price_history/` | PriceHistory 資料表 migration |
| `src/components/drugs/PriceTrendChart.tsx` | recharts 折線圖元件（client component） |
| `src/app/api/drugs/[code]/price-history/route.ts` | 藥價歷史 API（按健保碼查詢） |
| `scripts/backfill-price-history.ts` | 回填腳本：從 ChangeLog 調價紀錄重建歷史 |
| `src/__tests__/price-history.test.ts` | 7 個單元測試 |

#### 修改檔案
| 檔案 | 修改內容 |
|------|----------|
| `prisma/schema.prisma` | 新增 `PriceHistory` model（drugCode, price, date） |
| `src/lib/sync-engine.ts` | `syncDrugs()` 步驟 3b：新增/調價時自動寫入 PriceHistory |
| `src/app/drugs/page.tsx` | 展開列加入 `<PriceTrendChart>` 元件 |
| `package.json` | 新增 `recharts` 依賴 |

#### 資料流
```
同步引擎偵測到新增/調價
  → 寫入 ChangeLog（既有邏輯）
  → 寫入 PriceHistory（新增邏輯）
  → upsert Drug 表（既有邏輯）

前端展開藥品詳情
  → fetch /api/drugs/{code}/price-history
  → recharts LineChart 渲染趨勢圖
```

#### 回填既有資料
```bash
npx tsx scripts/backfill-price-history.ts
```
此腳本會從 `ChangeLog` 中提取所有藥品調價紀錄，重建歷史價格時間線。對沒有調價紀錄的藥品，以目前價格建立初始點。

#### 測試結果
- 41 個單元測試全部通過（含 7 個新增的 price-history 測試）
- `npm run build` 零錯誤，所有頁面 + API 編譯成功

### v1.2 藥品給付規定全文搜尋 完成摘要（2026-03-30）

#### 新增功能
- `/regulations` 給付規定全文搜尋頁面（即時搜尋 + 關鍵字高亮 + 展開全文）
- 藥品查詢頁展開詳情顯示「查看給付規定」連結
- 同步引擎自動擷取健保署 `PAYCODE_URL_LIST` 並存入 `Drug.regulationUrl`
- 獨立腳本批次下載並解析給付規定 HTML 頁面，儲存全文至 `DrugRegulation` 表

#### 新增檔案
| 檔案 | 說明 |
|------|------|
| `prisma/migrations/…add_drug_regulation/` | DrugRegulation 資料表 + Drug.regulationUrl 欄位 |
| `src/lib/regulation-search.ts` | 給付規定抓取、解析、全文搜尋引擎 |
| `src/app/regulations/page.tsx` | 給付規定搜尋頁面（搜尋框 + 結果列表 + 展開全文 + 高亮） |
| `src/app/api/regulations/search/route.ts` | 全文搜尋 API（GET /api/regulations/search?q=） |
| `src/app/api/drugs/[code]/regulation/route.ts` | 單一藥品給付規定 API |
| `scripts/sync-regulations.ts` | 給付規定同步腳本（--force / --limit=N） |
| `src/__tests__/regulation-search.test.ts` | 18 個單元測試 |

#### 修改檔案
| 檔案 | 修改內容 |
|------|----------|
| `prisma/schema.prisma` | 新增 `DrugRegulation` model + `Drug.regulationUrl` 欄位 |
| `src/lib/nhi-api.ts` | 解析 `PAYCODE_URL_LIST` 欄位，新增 `parseRegulationUrl()` |
| `src/lib/sync-engine.ts` | `syncDrugs()` upsert 時儲存 `regulationUrl` |
| `src/app/drugs/page.tsx` | 展開詳情加入「查看給付規定」連結 |
| `src/components/layout/Sidebar.tsx` | 側邊欄新增「給付規定」導覽項目 |

#### 使用方式
```bash
# 1. 先執行藥品同步（會擷取 regulationUrl）
npx tsx scripts/sync-daily.ts

# 2. 再執行給付規定同步（批次下載給付規定全文）
npx tsx scripts/sync-regulations.ts

# 選項：
npx tsx scripts/sync-regulations.ts --force        # 強制全部重新抓取
npx tsx scripts/sync-regulations.ts --limit=100     # 限制抓取筆數
```

#### 測試結果
- 59 個單元測試全部通過（含 18 個新增的 regulation-search 測試）
- `npm run build` 零錯誤，6 個頁面 + 8 個 API 端點編譯成功

---

## Phase 2 完成總結

所有 10 個 Session 已於 2026-03-29 全部完成。v1.0 功能完整包含：
- 藥品 / 特材 / 診療支付 三大查詢頁面（搜尋、篩選、分頁、RWD）
- 異動偵測引擎 + 異動紀錄時間軸
- 總覽儀表板（統計卡片 + 近期異動 + 同步狀態）
- LINE Notify 推播（即時異動 + 每日摘要）
- node-cron 排程同步（每日 07:00 同步、07:30 摘要）
- 手動同步功能（前端按鈕 + API）

## 建議下一步（v1.1+）

| 優先序 | 項目 | 說明 |
|--------|------|------|
| ~~1~~ | ~~特材資料爬蟲~~ | ✅ 已完成，22,816 筆從 INAE2000 API 自動同步 |
| ~~2~~ | ~~匯出 Excel~~ | ✅ 已完成，藥品/特材/診療三頁面皆可匯出 .xlsx |
| ~~3~~ | ~~日期範圍篩選~~ | ✅ 已完成，異動紀錄頁 from/to date picker |
| ~~4~~ | ~~測試覆蓋率~~ | ✅ 已完成，Vitest 34 個單元測試 + 10 個 API 測試 |
| ~~5~~ | ~~部署設定~~ | ✅ 已完成，Docker 多階段建置 + docker-compose |
| ~~6~~ | ~~歷史藥價趨勢圖~~ | ✅ 已完成，recharts 折線圖 + PriceHistory 資料表 + 回填腳本 |
| 7 | HIS 介接 | DrugMapping + SiSDCP 拋轉平台（v2.0） |
| 8 | LINE Notify 設定 | 替換真實 token，測試推播 |
| 9 | 院內伺服器部署 | docker compose up -d，設定 cron 排程 |

### Codex Review 修復摘要（2026-03-30）

針對 GitHub Codex 自動 Review 提出的 3 個問題進行修復：

| 嚴重度 | 檔案 | 問題 | 修復方式 |
|--------|------|------|----------|
| P1 | `docker-entrypoint.sh` | `prisma db push` 失敗時靜默繼續，導致容器帶著不完整 schema 啟動 | 移除 `2>/dev/null \|\| true`，改為失敗時 `exit 1` 中止啟動 |
| P2 | `src/lib/nhi-api.ts` | `parseRegulationUrl()` 對逗號分隔的多 URL 字串直接回傳整串，產生無效 URL | 先 `split(",")` 再取第一個 URL |
| P2 | `src/app/api/regulations/search/route.ts` | `page=abc` 等非數字參數 `parseInt` 產生 NaN，傳入 Prisma 造成 500 錯誤 | 加入 `\|\| 1` / `\|\| 20` 預設值，NaN 時退回安全值 |

---

## 五、Claude Code 啟動步驟

```bash
# 1. 建立專案
mkdir nhi-watch && cd nhi-watch
git init

# 2. 複製 Phase 1 產出
cp ~/Downloads/CLAUDE.md .
cp ~/Downloads/SPEC.md .
cp ~/Downloads/nhi-project-plan.md .
cp ~/Downloads/nhi-watch-prototype.jsx .

# 3. 啟動 Claude Code
claude

# 4. 初始化
> /init

# 5. 開始 Session 1
> 讀取 SPEC.md，開始建置專案骨架。
>   - 用 create-next-app 初始化 Next.js 14 + TypeScript + Tailwind
>   - 建立 Prisma schema（參考 SPEC.md 第三節）
>   - 執行 DB migration
>   - 建立目錄結構（參考 CLAUDE.md）
```

---

## 六、開發時的注意事項

### 資料來源 API
- 健保署 API base: `https://info.nhi.gov.tw`
- 藥品 Resource ID: `A21030000I-E41001-001`
- 支付標準 CSV: `https://info.nhi.gov.tw/IODE0000/IODE0000S09?id=1381`
- 支付標準 TXT: `https://info.nhi.gov.tw/IODE0000/IODE0000S09?id=1380`
- API 規格: `https://info.nhi.gov.tw/IODE0000/openapi.json`
- **無需 API key**，但有 rate limit，抓取間隔至少 1 秒

### 編碼與格式
- CSV 可能是 Big5 或 UTF-8 → 用 chardet 自動偵測
- 藥品代碼：英文 + 數字，共 10 碼
- 金額單位：新台幣（元），診療支付單位：點
- 日期格式：ISO 8601（YYYY-MM-DD）

### UI 規範
- 所有 UI 文字：繁體中文
- 變數/函式名稱：英文 camelCase
- 色彩系統：藍主色、綠新增、橘調價、紅停用、紫差額
- 參考 `nhi-watch-prototype.jsx` 的視覺設計

### 環境變數（.env）
```env
DATABASE_URL="file:./dev.db"
LINE_NOTIFY_TOKEN="your-token-here"
SYNC_CRON="0 7 * * *"
SUMMARY_CRON="30 7 * * *"
NHI_API_BASE="https://info.nhi.gov.tw"
NHI_DRUG_RESOURCE_ID="A21030000I-E41001-001"
NHI_PAYMENT_CSV_ID="1381"
```

---

## 七、未來版本路線圖

| 版本 | 功能 | 備註 |
|------|------|------|
| v1.0 | 基本查詢 + 同步 + 通知 | Phase 2 目標 |
| v1.1 | 匯出 Excel、日期範圍篩選 | 行政人員常用 |
| v1.2 | 藥品給付規定全文搜尋 | PDF/DOCX 整合 |
| v1.3 | 歷史藥價趨勢圖 | recharts 視覺化 |
| v2.0 | HIS 介接（DrugMapping + SiSDCP） | 需與 HIS 廠商協調 |
| v2.1 | 健保申報預估 | 根據用藥量估算月度申報 |
| v2.2 | 事前審查提醒 | 標記需事前審查品項 |

---

## 八、相關檔案清單

| 檔案 | 用途 | 位置 |
|------|------|------|
| CLAUDE.md | Claude Code 專案說明 | 專案根目錄 |
| SPEC.md | 功能規格書 | 專案根目錄 |
| nhi-project-plan.md | 全端專案規劃 | 專案根目錄 |
| nhi-watch-prototype.jsx | UI 原型（React） | 專案根目錄（開發參考） |
| HIS系統明細表0926.pdf | 部醫 HIS 模組清單 | docs/ 資料夾（參考用） |
| NIS系統明細表0926.pdf | NIS 護理系統清單 | docs/ 資料夾（暫不需要） |
