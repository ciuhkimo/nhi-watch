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
| **6** | 異動偵測引擎 + 異動紀錄頁 | 3hr | ⬜ 待做 | diff 比對邏輯（新增/調價/停用）、按日期分組時間軸 |
| **7** | 排程同步 + LINE Notify | 2hr | ⬜ 待做 | node-cron 07:00 同步、07:30 摘要、即時異動推播 |
| **8** | 總覽儀表板 + 統計 API | 2hr | ⬜ 待做 | 4 張 StatCard、近期異動、同步狀態面板 |
| **9** | 測試 + Bug 修復 | 3hr | ⬜ 待做 | API endpoint 測試、edge case（空資料、Big5 CSV、超長品名） |
| **10** | 部署設定 | 2hr | ⬜ 待做 | PM2（院內）或 Vercel（雲端）、cron job、環境變數 |

### Session 3 完成摘要（2026-03-29）
- `/drugs` 藥品查詢頁面：即時模糊搜尋（debounce 300ms）、分類/狀態篩選、表頭排序（健保碼/藥品名稱/健保價）、點擊展開詳情列、RWD 響應式表格（手機隱藏學名/劑型）、分頁導覽
- 匯出按鈕預留（disabled），v1.1 啟用

### Session 4 完成摘要（2026-03-29）
- `/devices` 特材查詢頁面：即時模糊搜尋、科別按鈕群組篩選（從資料動態產生）、卡片式排版（2 欄桌面/1 欄手機）、健保價藍色 vs 差額負擔橘色突顯、分頁
- 注意：TypeScript target 不支援 `[...new Set()]`，需用 `Array.from(new Set())`

### Session 5 完成摘要（2026-03-29）
- `/payments` 診療支付查詢頁面：即時模糊搜尋（代碼/項目名稱）、分類按鈕群組從 DB 動態產生、表格排版（代碼綠色 badge、分類手機隱藏、支付點數右對齊）、分頁
- 分類清單透過初次載入 100 筆資料提取不重複分類，獨立於搜尋/篩選邏輯

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
