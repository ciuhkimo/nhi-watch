# NHI-Watch — 健保給付查詢系統 全端專案規劃

> 恆春旅遊醫院 ・ 醫療行政管理  
> 版本 v0.1 ｜ 2026-03-28

---

## 一、專案總覽

### 目標
建置一個院內使用的健保給付查詢儀表板（NHI-Watch），讓行政人員每天能看到：
- 藥品健保給付價格與異動
- 特材健保給付與差額負擔
- 診療支付標準與點數
- 自動偵測的異動紀錄與通知

### 開發策略：兩階段推進

```
┌─────────────────────────────────────┐
│  Phase 1: Claude Project 快速原型    │
│  在 Claude.ai Project 裡設計初稿     │
│  → 確認功能需求、UI/UX、資料結構     │
│  → 產出 SPEC.md + 前端原型           │
├─────────────────────────────────────┤
│  Phase 2: Claude Code 正式開發       │
│  本機用 Claude Code 全端開發          │
│  → git init → 開發 → GitHub push     │
│  → 部署到院內伺服器或雲端            │
└─────────────────────────────────────┘
```

---

## 二、技術棧選型

### 推薦架構（對醫療行政人員友善、維護成本低）

| 層級 | 技術 | 選用理由 |
|------|------|----------|
| **前端** | Next.js 14+ (React) | SSR/SSG 支援、部署簡單、生態成熟 |
| **樣式** | Tailwind CSS | 快速開發、一致性高 |
| **後端 API** | Next.js API Routes | 前後端同一專案，降低複雜度 |
| **排程** | node-cron 或 cron job | 定時抓取健保署資料 |
| **資料庫** | SQLite（初期）→ PostgreSQL（成熟期） | SQLite 零配置、單檔案部署 |
| **ORM** | Prisma | 型別安全、migration 方便 |
| **通知** | LINE Notify API | 台灣最普及的推播管道 |
| **部署** | Vercel（雲端）或 PM2（院內伺服器） | 依網路政策選擇 |

### 替代方案（如果偏好 Python）

| 層級 | 技術 |
|------|------|
| 後端 | FastAPI |
| 前端 | 仍用 Next.js（或 Streamlit 快速原型） |
| 排程 | APScheduler 或 Linux crontab |
| 資料庫 | SQLite → PostgreSQL |

---

## 三、系統架構圖

```
                    ┌─────────────────────────┐
                    │    健保署 Open Data      │
                    │  info.nhi.gov.tw API     │
                    │  (CSV / JSON / TXT)      │
                    └───────────┬──────────────┘
                                │ 每日 07:00 排程抓取
                                ▼
┌──────────────────────────────────────────────────┐
│                   後端 (Next.js API)              │
│  ┌──────────┐  ┌───────────┐  ┌───────────────┐ │
│  │ 排程模組  │  │ 比對引擎  │  │ LINE Notify   │ │
│  │ (Cron)   │→│ (Diff)    │→│ 推播通知       │ │
│  └──────────┘  └─────┬─────┘  └───────────────┘ │
│                      │                            │
│              ┌───────▼───────┐                    │
│              │   SQLite DB   │                    │
│              │ ・drugs       │                    │
│              │ ・devices     │                    │
│              │ ・payments    │                    │
│              │ ・changes_log │                    │
│              └───────┬───────┘                    │
│                      │                            │
│  ┌───────────────────▼────────────────────────┐  │
│  │          REST API Endpoints                 │  │
│  │  GET /api/drugs?search=&category=           │  │
│  │  GET /api/devices?search=&category=         │  │
│  │  GET /api/payments?search=                  │  │
│  │  GET /api/changes?type=&from=&to=           │  │
│  │  GET /api/stats                             │  │
│  │  POST /api/sync (手動觸發同步)              │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│                 前端 (Next.js Pages)              │
│  ┌─────────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 總覽    │ │ 藥品 │ │ 特材 │ │ 診療 │ ...    │
│  │Dashboard│ │ Table│ │ Table│ │ Table│        │
│  └─────────┘ └──────┘ └──────┘ └──────┘        │
│  搜尋・篩選・排序・展開詳情・匯出 Excel          │
└──────────────────────────────────────────────────┘
```

---

## 四、資料來源與 API 接入策略

### 4.1 主要資料端點

| 資料類型 | 來源 | 格式 | 更新頻率 | 抓取方式 |
|----------|------|------|----------|----------|
| 藥品品項與藥價 | `info.nhi.gov.tw` Resource ID: `A21030000I-E41001-001` | CSV/JSON | 每日 | API GET |
| 診療支付標準 | `info.nhi.gov.tw/IODE0000/IODE0000S09?id=1381` | CSV | 每日 | 檔案下載 |
| 藥品給付規定 | `nhi.gov.tw` 藥品給付規定頁面 | PDF/DOCX | 不定期 | 手動更新或爬蟲 |
| 特材給付 | 健保署特材查詢頁面 | HTML | 不定期 | 爬蟲或手動 |
| 藥品許可證 | `data.gov.tw/dataset/9122` | CSV | 每週 | API GET |

### 4.2 API 呼叫範例

```javascript
// 1. 取得所有資料集清單
const datasets = await fetch(
  'https://info.nhi.gov.tw/api/iode0010/v1/rest/dataset?limit=100'
);

// 2. 取得特定資料集的詮釋資料（欄位說明等）
const meta = await fetch(
  'https://info.nhi.gov.tw/api/iode0010/v1/rest/dataset/A21030000I-E41001-001'
);

// 3. 取得資料集實際內容（藥品品項）
const drugs = await fetch(
  'https://info.nhi.gov.tw/api/iode0000s01/Dataset?rId=A21030000I-E41001-001'
);

// 4. 下載支付標準 CSV 檔
const paymentCSV = await fetch(
  'https://info.nhi.gov.tw/IODE0000/IODE0000S09?id=1381'
);
```

### 4.3 資料同步流程（每日排程）

```
07:00  ┌─ 下載最新 CSV/JSON
       │
07:01  ├─ 解析欄位（藥品代碼、品名、藥價、生效日...）
       │
07:02  ├─ 與昨日資料庫比對
       │    ├─ 新增品項 → 標記 changeType = "新增"
       │    ├─ 價格異動 → 標記 changeType = "調價"，記錄舊價/新價
       │    └─ 停用品項 → 標記 changeType = "停用"
       │
07:03  ├─ 寫入資料庫 + 更新 changes_log
       │
07:04  └─ 如有異動 → LINE Notify 推播摘要
```

---

## 五、資料庫設計

### 核心表格

```sql
-- 藥品給付
CREATE TABLE drugs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,     -- 健保代碼
  name        TEXT NOT NULL,            -- 品名
  generic     TEXT,                     -- 學名
  form        TEXT,                     -- 劑型
  strength    TEXT,                     -- 規格含量
  price       REAL NOT NULL,            -- 健保價
  unit        TEXT,                     -- 計價單位
  atc_code    TEXT,                     -- ATC 分類碼
  manufacturer TEXT,                   -- 製造商
  category    TEXT,                     -- 口服/注射/外用
  start_date  TEXT,                     -- 生效日
  end_date    TEXT,                     -- 終止日
  status      TEXT DEFAULT '給付中',
  note        TEXT,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 特材給付
CREATE TABLE devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT,                     -- 科別
  price       REAL NOT NULL,            -- 健保給付價
  self_pay    REAL DEFAULT 0,           -- 差額負擔上限
  unit        TEXT,
  start_date  TEXT,
  status      TEXT DEFAULT '給付中',
  note        TEXT,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 診療支付標準
CREATE TABLE payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,     -- 診療代碼
  name        TEXT NOT NULL,
  category    TEXT,
  price       REAL NOT NULL,            -- 支付點數
  unit        TEXT,
  start_date  TEXT,
  note        TEXT,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 異動紀錄（自動產生）
CREATE TABLE changes_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  table_name  TEXT NOT NULL,            -- drugs / devices / payments
  item_code   TEXT NOT NULL,
  change_type TEXT NOT NULL,            -- 新增 / 調價 / 停用
  field       TEXT,                     -- 異動欄位
  old_value   TEXT,
  new_value   TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 同步紀錄
CREATE TABLE sync_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      TEXT NOT NULL,
  status      TEXT NOT NULL,            -- success / failed
  records     INTEGER,
  changes     INTEGER,
  started_at  TEXT,
  finished_at TEXT,
  error_msg   TEXT
);
```

---

## 六、專案目錄結構

```
nhi-watch/
├── CLAUDE.md                  ← Claude Code 讀取的專案說明
├── SPEC.md                    ← 功能規格書
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
│
├── prisma/
│   └── schema.prisma          ← 資料庫 schema
│
├── src/
│   ├── app/                   ← Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx           ← 總覽儀表板
│   │   ├── drugs/
│   │   │   └── page.tsx       ← 藥品查詢頁
│   │   ├── devices/
│   │   │   └── page.tsx       ← 特材查詢頁
│   │   ├── payments/
│   │   │   └── page.tsx       ← 診療支付頁
│   │   ├── changes/
│   │   │   └── page.tsx       ← 異動紀錄頁
│   │   └── api/               ← API Routes
│   │       ├── drugs/
│   │       │   └── route.ts
│   │       ├── devices/
│   │       │   └── route.ts
│   │       ├── payments/
│   │       │   └── route.ts
│   │       ├── changes/
│   │       │   └── route.ts
│   │       ├── stats/
│   │       │   └── route.ts
│   │       └── sync/
│   │           └── route.ts   ← 手動觸發同步
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/
│   │   │   ├── DataTable.tsx  ← 通用可排序表格
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── Timeline.tsx
│   │   └── charts/
│   │       └── PriceChart.tsx
│   │
│   ├── lib/
│   │   ├── db.ts              ← 資料庫連線
│   │   ├── nhi-api.ts         ← 健保署 API 封裝
│   │   ├── sync-engine.ts     ← 同步 + 比對引擎
│   │   ├── diff-detector.ts   ← 異動偵測
│   │   ├── csv-parser.ts      ← CSV 解析
│   │   └── notify.ts          ← LINE Notify 推播
│   │
│   └── types/
│       └── index.ts           ← TypeScript 型別定義
│
├── scripts/
│   ├── seed.ts                ← 初始資料匯入
│   ├── sync-daily.ts          ← 每日同步腳本
│   └── setup-cron.sh          ← cron job 設定
│
├── data/
│   ├── nhi-drugs-sample.csv   ← 範例資料（開發用）
│   └── nhi-payments-sample.csv
│
├── docs/
│   ├── api-endpoints.md       ← API 文件
│   ├── data-sources.md        ← 資料來源文件
│   └── deployment.md          ← 部署指南
│
└── .claude/
    └── commands/
        ├── sync.md            ← /project:sync 指令
        └── test-api.md        ← /project:test-api 指令
```

---

## 七、開發階段規劃

### Phase 1：Claude Project 原型設計（1-2 週）

在 Claude.ai Project 裡完成：

| 步驟 | 產出 | 說明 |
|------|------|------|
| 1.1 | SPEC.md | 用「Interview me」方式，讓 Claude 問你需求細節 |
| 1.2 | UI 原型 (React Artifact) | 就是我們剛做的那個互動式儀表板 |
| 1.3 | 資料結構確認 | 確認 DB schema、API 欄位映射 |
| 1.4 | API 可行性測試 | 在 Project 裡測試健保署 API 回傳格式 |
| 1.5 | CLAUDE.md 初稿 | 寫好專案說明，後續交給 Claude Code |

### Phase 2：Claude Code 本機開發（2-4 週）

```bash
# Step 1: 建立專案
mkdir nhi-watch && cd nhi-watch
git init

# Step 2: 啟動 Claude Code
claude

# Step 3: 初始化
> /init

# Step 4: 貼上 SPEC.md（從 Phase 1 產出）
> 讀取 SPEC.md，開始建置專案

# Step 5: 分階段開發（每個功能一個 session）
Session 1: 專案骨架 + 資料庫 schema
Session 2: 健保署 API 串接模組
Session 3: 藥品查詢頁面
Session 4: 特材查詢頁面
Session 5: 診療支付頁面
Session 6: 異動偵測 + 異動紀錄頁
Session 7: 排程同步 + LINE Notify
Session 8: 總覽儀表板 + 統計
Session 9: 測試 + 修 bug
Session 10: 部署設定
```

### Phase 3：GitHub + 部署（1 週）

```bash
# 建立 GitHub repo
gh repo create nhi-watch --private

# 推送
git remote add origin https://github.com/YOUR_USERNAME/nhi-watch.git
git push -u origin main

# 後續開發用 branch
git checkout -b feature/add-export-excel
# ... 開發完成 ...
git add . && git commit -m "feat: 新增匯出 Excel 功能"
git push origin feature/add-export-excel
# 在 GitHub 上建 PR → merge
```

---

## 八、CLAUDE.md 模板

以下是放在專案根目錄的 `CLAUDE.md`，Claude Code 每次開始都會讀取：

```markdown
# NHI-Watch（健保給付查詢系統）

## 專案概述
恆春旅遊醫院內部使用的健保給付查詢儀表板（NHI-Watch），每日自動同步健保署開放資料，
提供藥品、特材、診療支付標準的查詢與異動追蹤。

## 技術棧
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (開發) / PostgreSQL (生產)
- node-cron 排程
- LINE Notify 推播

## 關鍵指令
- `npm run dev` — 啟動開發伺服器
- `npm run build` — 建置生產版本
- `npx prisma migrate dev` — 執行資料庫 migration
- `npx prisma studio` — 開啟資料庫 GUI
- `npx tsx scripts/sync-daily.ts` — 手動執行同步
- `npm test` — 執行測試

## 程式碼風格
- 使用 ES modules (import/export)
- React 元件使用 functional component + hooks
- API routes 使用 Next.js Route Handlers
- 所有 UI 文字使用繁體中文
- 變數/函式名稱使用英文 camelCase
- 註解可使用中文

## 資料來源
- 健保署開放資料 API: https://info.nhi.gov.tw
- 藥品品項 Resource ID: A21030000I-E41001-001
- 支付標準 CSV: https://info.nhi.gov.tw/IODE0000/IODE0000S09?id=1381
- API 規格: https://info.nhi.gov.tw/IODE0000/openapi.json

## 注意事項
- 健保署 API 無需 API key，但有 rate limit，抓取間隔至少 1 秒
- CSV 檔案編碼為 Big5 或 UTF-8，需自動偵測
- 藥品代碼格式：英文字母 + 數字，共 10 碼
- 所有金額單位為新台幣（元），診療支付單位為「點」
- 日期格式統一使用 ISO 8601 (YYYY-MM-DD)

## 資料庫
- Schema 定義在 prisma/schema.prisma
- 修改 schema 後執行 npx prisma migrate dev
- 種子資料在 scripts/seed.ts
```

---

## 九、Claude Project 的使用方式

### 9.1 建立 Project

1. 在 Claude.ai 點選左側「Projects」
2. 建立新 Project：「NHI-Watch 健保給付查詢系統」
3. 在 Project Instructions 裡貼上專案背景說明

### 9.2 Project Instructions 建議內容

```
你正在協助恆春旅遊醫院的醫療行政人員設計並開發「NHI-Watch 健保給付查詢系統」。

專案目標：
- 建置一個每日自動更新的健保給付查詢儀表板
- 資料來源為健保署開放資料 API
- 涵蓋藥品給付、特材給付、診療支付標準
- 自動偵測異動並推播通知

技術決策：
- 全端使用 Next.js 14 + TypeScript
- 資料庫使用 SQLite（初期）→ PostgreSQL（成熟期）
- 使用 Prisma ORM
- 排程使用 node-cron
- 通知使用 LINE Notify

語言：
- 所有 UI、文件、註解使用繁體中文
- 程式碼變數/函式名使用英文

開發階段：
- 目前在 Phase 1（原型設計），完成後會轉到 Claude Code 開發
- 產出需要包含 SPEC.md、UI 原型、資料結構確認
```

### 9.3 在 Project 裡的對話流程

```
對話 1: 「請根據專案目標，用 Interview me 的方式問我需求細節，
         涵蓋功能需求、使用者場景、邊界情況。
         問完後寫成 SPEC.md。」

對話 2: 「根據 SPEC.md，設計資料庫 schema，
         產出 Prisma schema 檔案。」

對話 3: 「設計前端 UI 原型（React artifact），
         包含所有頁面的互動式版本。」

對話 4: 「測試健保署 API 的回傳格式，
         確認欄位映射關係，寫成 data-sources.md。」

對話 5: 「彙整以上所有產出，產出最終版 CLAUDE.md，
         準備交給 Claude Code 開發。」
```

---

## 十、從 Claude Project → Claude Code → GitHub 的轉換流程

```
┌──────────────────────────────────────────────────────┐
│  Claude Project (claude.ai)                          │
│                                                      │
│  ① 撰寫 SPEC.md（功能規格）                          │
│  ② 設計 UI 原型（React artifact）                    │
│  ③ 確認資料結構（DB schema）                          │
│  ④ 測試 API 格式（健保署 Open Data）                  │
│  ⑤ 產出 CLAUDE.md                                    │
│                                                      │
│  → 將 SPEC.md, CLAUDE.md 複製到本機                   │
└──────────────────┬───────────────────────────────────┘
                   │ 複製檔案到本機
                   ▼
┌──────────────────────────────────────────────────────┐
│  本機開發 + Claude Code (Terminal)                     │
│                                                      │
│  $ mkdir nhi-watch && cd nhi-watch    │
│  $ git init                                          │
│  $ cp ~/Downloads/CLAUDE.md .                        │
│  $ cp ~/Downloads/SPEC.md .                          │
│  $ claude                                            │
│  > /init                                             │
│  > 讀取 SPEC.md 開始建置...                           │
│                                                      │
│  → 每完成一個功能就 git commit                        │
│  → 功能穩定後 → 建 GitHub repo                       │
└──────────────────┬───────────────────────────────────┘
                   │ git push
                   ▼
┌──────────────────────────────────────────────────────┐
│  GitHub (版本控制 + 協作)                              │
│                                                      │
│  main branch     ← 穩定版本                           │
│  develop branch  ← 開發中                             │
│  feature/* branch ← 各功能分支                        │
│                                                      │
│  → PR review → merge → deploy                        │
└──────────────────────────────────────────────────────┘
```

---

## 十一、部署選項

### 選項 A：院內伺服器部署（推薦起步方案）

```bash
# 在院內 Linux 伺服器上
git clone https://github.com/YOUR_USERNAME/nhi-watch.git
cd nhi-watch
npm install
npm run build

# 使用 PM2 管理程序
npm install -g pm2
pm2 start npm --name "nhi-watch" -- start
pm2 startup  # 開機自啟動
pm2 save

# 設定 cron job 每日同步
crontab -e
# 加入: 0 7 * * * cd /path/to/nhi-watch && npx tsx scripts/sync-daily.ts
```

- 優點：資料不出院、零月費、完全掌控
- 需求：一台能跑 Node.js 的 Linux 機器（甚至 Raspberry Pi 都行）

### 選項 B：Vercel 雲端部署

```bash
npm install -g vercel
vercel deploy
```

- 優點：零伺服器維護、HTTPS 自動、全球 CDN
- 注意：免費方案有 Serverless Function 執行時間限制

### 選項 C：Docker 容器化

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 十二、後續擴充方向

| 階段 | 功能 | 說明 |
|------|------|------|
| v1.1 | 匯出 Excel | 行政人員可下載查詢結果 |
| v1.2 | 藥品給付規定全文搜尋 | 整合 PDF/DOCX 給付規定文件 |
| v1.3 | 歷史藥價趨勢圖 | 視覺化藥品價格變化 |
| v2.0 | 與院內 HIS 串接 | 比對院內用藥品項 vs 健保給付 |
| v2.1 | 健保申報預估 | 根據用藥量估算月度健保申報金額 |
| v2.2 | 事前審查提醒 | 標記需事前審查的品項 |
| v3.0 | 多院區支援 | 如未來有分院需求 |

---

## 附錄：快速開始 Checklist

- [ ] 在 Claude.ai 建立 Project「NHI-Watch 健保給付查詢系統」
- [ ] 貼上 Project Instructions
- [ ] 完成 SPEC.md（與 Claude 對話產出）
- [ ] 完成 UI 原型（React artifact）
- [ ] 確認資料庫 schema
- [ ] 測試健保署 API 回傳格式
- [ ] 產出 CLAUDE.md
- [ ] 本機安裝 Node.js 20+、Claude Code
- [ ] `git init` + 複製 CLAUDE.md、SPEC.md
- [ ] 啟動 Claude Code，開始分 session 開發
- [ ] 每個功能完成後 `git commit`
- [ ] 系統穩定後建 GitHub repo + `git push`
- [ ] 部署到院內伺服器或 Vercel
- [ ] 設定 cron job 每日同步
- [ ] 設定 LINE Notify 推播
