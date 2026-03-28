# NHI-Watch 功能規格書（SPEC.md）

> 恆春旅遊醫院 ・ 醫療行政管理  
> 版本 v1.0 ｜ 2026-03-28  
> 狀態：Phase 1 原型確認 → 準備進入 Phase 2 開發

---

## 一、專案概述

### 1.1 目標

建置院內使用的健保給付查詢儀表板（NHI-Watch），提供：

- 藥品、特材、診療支付標準的即時查詢
- 每日自動同步健保署開放資料
- 自動偵測異動（新增、調價、停用）並推播通知
- 未來可介接部醫 HIS 系統

### 1.2 使用者

| 角色 | 主要需求 | 使用頻率 |
|------|----------|----------|
| 藥局藥師 | 快速查藥價、確認健保碼、ATC 碼 | 每日多次 |
| 醫務行政人員 | 查詢診療支付點數、追蹤異動 | 每日 |
| 院長／主管 | 總覽統計、異動趨勢、決策參考 | 每週 |

### 1.3 設計原則

- **查價優先**：搜尋框永遠可及，支援健保碼、品名、學名模糊搜尋
- **異動醒目**：新增/調價/停用以色彩標籤區分，重要異動即時推播
- **RWD 必備**：電腦 + 手機都要能用，表格在小螢幕可橫滑或摺疊
- **低維護成本**：排程自動同步，出問題有同步紀錄可排查

---

## 二、功能規格

### 2.1 總覽儀表板（Dashboard）

**路由**：`/`（首頁）

**統計卡片（4 張）**：
- 藥品品項數（給付中）
- 特材品項數（含差額負擔項數）
- 診療項目數
- 今日異動數（分類：新增/調價/停用）

**近期異動時間軸**：
- 顯示最近 7 天的異動紀錄
- 每筆顯示：品項名稱、健保碼、異動類型標籤、日期
- 調價類顯示舊值 → 新值
- 點擊可跳轉到該品項詳情

**同步狀態面板**：
- 上次同步時間
- 同步狀態（成功/失敗）
- 資料筆數
- 偵測異動數
- 「手動同步」按鈕

**本月異動統計**：
- 新增品項數
- 價格異動數
- 停用品項數

---

### 2.2 藥品查詢（Drugs）

**路由**：`/drugs`

**搜尋功能**：
- 全欄位模糊搜尋（健保碼、品名、學名）
- 即時篩選，無需按 Enter
- 搜尋結果即時更新筆數

**篩選條件**：
- 類別：全部 / 口服 / 注射 / 外用
- 狀態：全部 / 給付中 / 停用

**表格欄位**：

| 欄位 | 說明 | 排序 | 手機顯示 |
|------|------|------|----------|
| 健保碼 | 10 碼，code 格式顯示 | ✅ | ✅ |
| 藥品名稱 | 英文品名 | ✅ | ✅ |
| 學名 | Generic name | ❌ | 隱藏（md 以上） |
| 健保價 | 新台幣，小數 2 位 | ✅ | ✅ |
| 劑型 | 錠劑/膜衣錠/注射液等 | ❌ | 隱藏（lg 以上） |
| 狀態 | 給付中 / 停用（Badge） | ❌ | ✅ |

**展開詳情**（點擊列展開）：
- 規格含量、計價單位、ATC 碼
- 製造商、類別、生效日

**匯出**：
- 匯出按鈕（v1.1 實作，匯出為 Excel）

---

### 2.3 特材查詢（Devices）

**路由**：`/devices`

**搜尋功能**：
- 搜尋特材代碼、品名、科別

**顯示方式**：卡片式排版（每列 1~2 張）

**每張卡片內容**：
- 品名、代碼（Badge）、狀態
- 科別、計價單位
- 健保給付價（大字藍色）
- 差額負擔上限（大字橘色，無則顯示「—」）

---

### 2.4 診療支付查詢（Payments）

**路由**：`/payments`

**搜尋功能**：
- 搜尋診療代碼、項目名稱

**分類篩選**：
- 按鈕群組切換：全部 / 診察費 / 處置費 / 檢查費 / 檢驗費 / ...
- 分類項目從資料庫動態產生

**表格欄位**：

| 欄位 | 說明 |
|------|------|
| 診療代碼 | code 格式顯示 |
| 項目名稱 | 中文 |
| 分類 | 標籤顯示 |
| 支付點數 | 數字 + 「點」 |

---

### 2.5 異動紀錄（Changes）

**路由**：`/changes`

**篩選條件**：
- 異動類型：全部 / 新增 / 調價 / 停用
- （v1.1 新增日期範圍篩選）

**顯示方式**：按日期分組的時間軸

**每筆異動內容**：
- 左側圖示：＋（新增，綠）/ △（調價，橘）/ ✕（停用，紅）
- 品項名稱 + 異動標籤 + 資料類型（藥品/特材/診療）
- 健保碼
- 調價類顯示：舊值 → 新值（含 $ 符號）

---

## 三、資料架構

### 3.1 資料庫 Schema（Prisma）

```prisma
// 藥品給付
model Drug {
  id           Int      @id @default(autoincrement())
  code         String   @unique          // 健保代碼（10碼）
  name         String                    // 品名
  generic      String?                   // 學名
  form         String?                   // 劑型
  strength     String?                   // 規格含量
  price        Float                     // 健保價（元）
  unit         String?                   // 計價單位
  atcCode      String?                   // ATC 分類碼
  manufacturer String?                   // 製造商
  category     String?                   // 口服/注射/外用
  startDate    String?                   // 生效日（ISO 8601）
  endDate      String?                   // 終止日
  status       String   @default("給付中")
  note         String?
  updatedAt    DateTime @default(now()) @updatedAt

  // HIS 介接預留欄位
  hospitalCode String?                   // 院內藥碼（未來由 HIS 對照填入）

  @@index([code])
  @@index([atcCode])
  @@index([status])
}

// 特材給付
model Device {
  id           Int      @id @default(autoincrement())
  code         String   @unique
  name         String
  category     String?                   // 科別
  price        Float                     // 健保給付價
  selfPay      Float    @default(0)      // 差額負擔上限
  unit         String?
  startDate    String?
  status       String   @default("給付中")
  note         String?
  updatedAt    DateTime @default(now()) @updatedAt

  hospitalCode String?                   // 院內特材碼

  @@index([code])
  @@index([category])
}

// 診療支付標準
model Payment {
  id           Int      @id @default(autoincrement())
  code         String   @unique          // 診療代碼
  name         String
  category     String?
  price        Float                     // 支付點數
  unit         String?
  startDate    String?
  note         String?
  updatedAt    DateTime @default(now()) @updatedAt

  @@index([code])
  @@index([category])
}

// 異動紀錄（自動產生）
model ChangeLog {
  id           Int      @id @default(autoincrement())
  date         String                    // 異動日期
  tableName    String                    // drugs / devices / payments
  itemCode     String                    // 品項代碼
  itemName     String                    // 品項名稱（方便顯示）
  changeType   String                    // 新增 / 調價 / 停用
  field        String?                   // 異動欄位名稱
  oldValue     String?
  newValue     String?
  createdAt    DateTime @default(now())

  @@index([date])
  @@index([tableName])
  @@index([changeType])
}

// 同步紀錄
model SyncLog {
  id           Int      @id @default(autoincrement())
  source       String                    // 資料來源標識
  status       String                    // success / failed
  records      Int?                      // 處理筆數
  changes      Int?                      // 偵測異動數
  startedAt    DateTime
  finishedAt   DateTime?
  errorMsg     String?
}

// HIS 藥碼對照表（未來介接用）
model DrugMapping {
  id             Int    @id @default(autoincrement())
  nhiCode        String                  // 健保碼
  hospitalCode   String                  // 院內藥碼
  hospitalName   String?                 // 院內品名
  mappedAt       DateTime @default(now())
  mappedBy       String?                 // 建立者

  @@unique([nhiCode, hospitalCode])
  @@index([nhiCode])
  @@index([hospitalCode])
}
```

### 3.2 HIS 介接設計說明

目前院內使用**部醫 HIS 系統**（衛福部所屬 19 家醫院共用），關鍵對接點：

| HIS 模組 | 對接方式 | NHI-Watch 用途 |
|---------|----------|--------------|
| 34.藥局系統（健保署藥價比對） | 透過 DrugMapping 表做院內碼 ↔ 健保碼對照 | 藥師查藥時可用院內碼搜尋 |
| 5.住院申報 / 13.門診申報 | 讀取申報用診療代碼 | 確認申報碼與支付標準一致 |
| 23.重複用藥(ATC)稽核模組 | 共用 ATC 碼分類 | 藥品 ATC 分類篩選 |
| 61.雲端藥歷介接 | 未來串接 | 交叉比對病患用藥 |
| SiSDCP 拋轉平台（66-69） | 標準第三方串接管道 | NHI-Watch 走此管道與 HIS 交換資料 |

**Phase 1 不實作 HIS 介接**，僅在 schema 預留 `hospitalCode` 欄位和 `DrugMapping` 表。Phase 2（v2.0）正式串接時，介接策略為：

1. 由 HIS 匯出院內藥品/特材對照表（CSV 或透過 SiSDCP API）
2. 匯入 `DrugMapping` 表建立對照關係
3. NHI-Watch 搜尋功能增加「院內碼」搜尋
4. 總覽儀表板增加「院內用藥 vs 健保給付比對」功能

---

## 四、API 設計

### 4.1 端點一覽

| 方法 | 路由 | 說明 | 參數 |
|------|------|------|------|
| GET | `/api/drugs` | 藥品查詢 | `search`, `category`, `status`, `page`, `limit` |
| GET | `/api/drugs/[code]` | 單一藥品詳情 | — |
| GET | `/api/devices` | 特材查詢 | `search`, `category`, `page`, `limit` |
| GET | `/api/payments` | 診療支付查詢 | `search`, `category`, `page`, `limit` |
| GET | `/api/changes` | 異動紀錄 | `type`, `from`, `to`, `page`, `limit` |
| GET | `/api/stats` | 總覽統計數據 | — |
| POST | `/api/sync` | 手動觸發同步 | — |
| GET | `/api/sync/status` | 同步狀態查詢 | — |

### 4.2 回傳格式

```typescript
// 成功
{
  success: true,
  data: T | T[],
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}

// 失敗
{
  success: false,
  error: string
}
```

### 4.3 搜尋邏輯

藥品搜尋優先順序（智慧排序）：
1. 完全匹配健保碼 → 最優先
2. 健保碼前綴匹配 → 次優先
3. 品名包含搜尋詞 → 第三
4. 學名包含搜尋詞 → 第四

---

## 五、資料同步機制

### 5.1 同步排程

- 每日 **07:00** 自動執行（node-cron）
- 手動觸發：透過 `/api/sync` 或管理介面按鈕

### 5.2 同步流程

```
07:00  下載最新資料
         ├─ 藥品品項：GET /api/iode0000s01/Dataset?rId=A21030000I-E41001-001
         ├─ 支付標準：GET /IODE0000/IODE0000S09?id=1381（CSV）
         └─ 特材資料：（爬蟲或手動更新）

07:01  解析資料
         ├─ CSV 編碼偵測（Big5 / UTF-8 自動切換）
         ├─ 欄位映射到 DB schema
         └─ 資料清洗（去空白、格式化日期）

07:02  比對異動
         ├─ 新增品項 → changeType = "新增"
         ├─ 價格異動 → changeType = "調價"，記錄 old/new
         ├─ 品項消失 → changeType = "停用"
         └─ 寫入 ChangeLog

07:03  更新資料庫
         ├─ 批次 upsert（有則更新，無則新增）
         └─ 寫入 SyncLog

07:04  推播通知
         ├─ 有異動 → 即時推播摘要至 LINE Notify
         └─ 記錄推播結果
```

### 5.3 每日摘要通知（07:30）

```
📋 NHI-Watch 每日異動摘要
📅 2026-03-28

🟢 新增 2 項
  ・ELIQUIS 5MG (AC61234100)
  ・[品名] ([代碼])

🟡 調價 1 項
  ・ASPIRIN 100MG: $2.10 → $1.87

🔴 停用 0 項

📊 資料庫現有：藥品 18,432 | 特材 3,856 | 診療 5,214
🔄 同步時間：07:04:23
```

### 5.4 即時異動通知

當同步偵測到異動時，立即推播：

```
⚡ NHI-Watch 異動通知
ASPIRIN TABLETS 100MG (AC49218100)
💰 調價：$2.10 → $1.87
📅 生效日：2026-03-28
```

---

## 六、UI/UX 規格

### 6.1 佈局

- **側邊欄**（桌面）：固定 240px，含 Logo + 導航 + 同步資訊
- **漢堡選單**（手機）：點擊展開側邊欄，背景遮罩
- **頂部列**：頁面標題 + 同步狀態指示燈
- **內容區**：最大寬度 1280px，左右 padding 16px（手機）/ 24px（桌面）

### 6.2 色彩系統

| 用途 | 色彩 | Tailwind |
|------|------|----------|
| 主色（品牌） | 藍色 | `blue-600` |
| 新增/給付中 | 綠色 | `emerald-500` |
| 調價/警告 | 橘色 | `amber-500` |
| 停用/錯誤 | 紅色 | `rose-500` |
| 差額負擔 | 紫色 | `violet-500` |
| 背景 | 淺灰 | `#f8f9fb` |
| 卡片 | 白色 | `white` |
| 文字 | 深灰 | `slate-800` |
| 次要文字 | 中灰 | `slate-400` |

### 6.3 元件規格

**Badge（標籤）**：
- 圓角 `rounded-md`，內邊距 `px-2 py-0.5`
- 文字 `text-xs font-medium`
- 帶 `ring-1 ring-inset` 邊框

**StatCard（統計卡片）**：
- 左側 1px 漸層色條
- 標題 `text-sm text-slate-500`
- 數字 `text-2xl font-bold`
- 右上角圖示

**表格**：
- 表頭 `bg-slate-50/80`
- hover 效果 `hover:bg-blue-50/30`
- 健保碼使用 `font-mono` + 背景色 code 樣式
- 可排序欄位顯示排序圖示

### 6.4 RWD 斷點

| 斷點 | 寬度 | 調整 |
|------|------|------|
| 手機 | < 640px | 漢堡選單、表格隱藏次要欄位、卡片單欄 |
| 平板 | 640-1024px | 側邊欄可收合、表格顯示學名 |
| 桌面 | > 1024px | 側邊欄固定、完整表格、卡片雙欄 |

---

## 七、技術規格

### 7.1 技術棧

| 層級 | 技術 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 14+ |
| 語言 | TypeScript | 5+ |
| 樣式 | Tailwind CSS | 3+ |
| ORM | Prisma | 5+ |
| 資料庫 | SQLite（開發）/ PostgreSQL（生產） | — |
| 排程 | node-cron | — |
| 通知 | LINE Notify API | — |
| 部署 | PM2（院內）或 Vercel（雲端） | — |

### 7.2 環境變數

```env
DATABASE_URL="file:./dev.db"
LINE_NOTIFY_TOKEN="your-token-here"
SYNC_CRON="0 7 * * *"
SUMMARY_CRON="30 7 * * *"
NHI_API_BASE="https://info.nhi.gov.tw"
NHI_DRUG_RESOURCE_ID="A21030000I-E41001-001"
NHI_PAYMENT_CSV_ID="1381"
```

### 7.3 注意事項

- 健保署 API 無需 API key，但有 rate limit → 請求間隔至少 1 秒
- CSV 檔案編碼可能是 Big5 或 UTF-8 → 需自動偵測（使用 iconv-lite + chardet）
- 藥品代碼格式：英文字母 + 數字，共 10 碼
- 所有金額單位：新台幣（元），診療支付單位：點
- 日期格式統一 ISO 8601（YYYY-MM-DD）

---

## 八、開發階段

### Phase 1：原型確認 ✅（本階段）

- [x] 需求訪談
- [x] UI 原型（React artifact）
- [x] 資料結構確認（Prisma schema）
- [x] HIS 介接方向確認（部醫 HIS + SiSDCP）
- [x] SPEC.md 產出
- [x] CLAUDE.md 產出

### Phase 2：Claude Code 開發（2-4 週）

| Session | 功能 | 預估時間 |
|---------|------|----------|
| 1 | 專案骨架 + Prisma schema + DB migration | 2hr |
| 2 | 健保署 API 串接模組 + CSV 解析器 | 3hr |
| 3 | 藥品查詢頁面（搜尋、篩選、排序、詳情） | 3hr |
| 4 | 特材查詢頁面 | 2hr |
| 5 | 診療支付頁面 | 2hr |
| 6 | 異動偵測引擎 + 異動紀錄頁面 | 3hr |
| 7 | 排程同步 + LINE Notify 推播 | 2hr |
| 8 | 總覽儀表板 + 統計 API | 2hr |
| 9 | 測試 + Bug 修復 + 效能優化 | 3hr |
| 10 | 部署設定（PM2 or Vercel） | 2hr |

### Phase 3：部署 + 上線（1 週）

- GitHub repo 建立
- 院內伺服器或 Vercel 部署
- cron job 設定
- LINE Notify 群組設定
- 使用者驗收測試

### 未來版本路線圖

| 版本 | 功能 |
|------|------|
| v1.1 | 匯出 Excel、日期範圍篩選 |
| v1.2 | 藥品給付規定全文搜尋 |
| v1.3 | 歷史藥價趨勢圖 |
| v2.0 | HIS 介接（DrugMapping + SiSDCP） |
| v2.1 | 健保申報預估 |
| v2.2 | 事前審查提醒 |

---

## 附錄 A：健保署 API 欄位映射

### 藥品品項（Resource ID: A21030000I-E41001-001）

| API 欄位 | DB 欄位 | 說明 |
|---------|--------|------|
| 藥品代碼 | code | 健保碼 |
| 藥品名稱 | name | 品名 |
| 成份名稱 | generic | 學名 |
| 劑型 | form | 劑型 |
| 藥品規格含量 | strength | 規格 |
| 參考價 | price | 健保價 |
| 計價單位 | unit | 單位 |
| ATC碼 | atcCode | ATC |
| 藥商名稱 | manufacturer | 製造商 |
| 生效日期 | startDate | 生效日 |
| 終止日期 | endDate | 終止日 |

### 支付標準 CSV 欄位

| CSV 欄位 | DB 欄位 | 說明 |
|---------|--------|------|
| 診療代碼 | code | 代碼 |
| 項目名稱 | name | 名稱 |
| 分類 | category | 分類 |
| 支付點數 | price | 點數 |

---

## 附錄 B：部醫 HIS 系統模組對照

本院使用之 HIS 為衛福部所屬醫院標準系統，共 45 類主體 + 20 類介接 + 5 類拋轉模組。

與 NHI-Watch 相關之模組：

| 編號 | 模組名稱 | 相關功能 | NHI-Watch 對接方向 |
|------|----------|----------|-----------------|
| 1 | 掛批管理系統 | 醫令明細清單、批價作業 | 讀取醫令中的健保碼 |
| 2 | 門診醫令系統 | 診療代碼明細 | 確認申報碼 |
| 5 | 住院申報系統 | 健保單價比對 | 驗證藥價一致性 |
| 13 | 門診申報系統 | 健保資料維護 | 申報碼對照 |
| 23 | 重複用藥(ATC)稽核 | ATC 碼檢核 | 共用 ATC 分類 |
| 34 | 藥局系統 | 健保署藥價比對、ATC 碼維護 | 院內藥碼對照 |
| 43 | IC 讀卡模組 | IC 卡內容查詢 | 取得病患健保資訊 |
| 56 | 健保署資料介接 | 健保署資料交換 | 資料來源互補 |
| 61 | 雲端藥歷介接 | 雲端藥歷查詢 | 交叉比對用藥 |
| 66-69 | SiSDCP 拋轉模組 | 第三方系統串接 | NHI-Watch 標準介接管道 |
