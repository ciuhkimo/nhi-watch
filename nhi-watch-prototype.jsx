import { useState, useMemo } from "react";

// ─── Mock Data ───────────────────────────────────────────
const MOCK_DRUGS = [
  { code: "AC49218100", name: "ASPIRIN TABLETS 100MG", generic: "Aspirin", form: "錠劑", strength: "100mg", price: 1.87, unit: "錠", atcCode: "B01AC06", manufacturer: "中國化學製藥", category: "口服", startDate: "2024-01-01", status: "給付中" },
  { code: "AC58270100", name: "LIPITOR 20MG TABLETS", generic: "Atorvastatin", form: "膜衣錠", strength: "20mg", price: 26.40, unit: "錠", atcCode: "C10AA05", manufacturer: "輝瑞大藥廠", category: "口服", startDate: "2024-01-01", status: "給付中" },
  { code: "AC60150100", name: "PLAVIX 75MG TABLETS", generic: "Clopidogrel", form: "膜衣錠", strength: "75mg", price: 22.50, unit: "錠", atcCode: "B01AC04", manufacturer: "賽諾菲", category: "口服", startDate: "2024-03-01", status: "給付中" },
  { code: "BC27520100", name: "AUGMENTIN 1G TABLETS", generic: "Amoxicillin/Clavulanate", form: "膜衣錠", strength: "875mg/125mg", price: 15.80, unit: "錠", atcCode: "J01CR02", manufacturer: "葛蘭素", category: "口服", startDate: "2024-01-01", status: "給付中" },
  { code: "AC55782221", name: "NEXIUM 40MG", generic: "Esomeprazole", form: "腸溶膜衣錠", strength: "40mg", price: 28.30, unit: "錠", atcCode: "A02BC05", manufacturer: "阿斯特捷利康", category: "口服", startDate: "2024-06-01", status: "給付中" },
  { code: "AC48672100", name: "GLUCOPHAGE 500MG", generic: "Metformin", form: "膜衣錠", strength: "500mg", price: 2.36, unit: "錠", atcCode: "A10BA02", manufacturer: "美納里尼", category: "口服", startDate: "2024-01-01", status: "給付中" },
  { code: "AC59830100", name: "JANUVIA 100MG", generic: "Sitagliptin", form: "膜衣錠", strength: "100mg", price: 28.00, unit: "錠", atcCode: "A10BH01", manufacturer: "默沙東", category: "口服", startDate: "2024-01-01", status: "給付中" },
  { code: "AC61234100", name: "ELIQUIS 5MG", generic: "Apixaban", form: "膜衣錠", strength: "5mg", price: 30.00, unit: "錠", atcCode: "B01AF02", manufacturer: "輝瑞/BMS", category: "口服", startDate: "2024-02-01", status: "給付中" },
  { code: "BC22011100", name: "CRAVIT 500MG", generic: "Levofloxacin", form: "膜衣錠", strength: "500mg", price: 45.90, unit: "錠", atcCode: "J01MA12", manufacturer: "第一三共", category: "口服", startDate: "2023-06-01", status: "停用" },
];

const MOCK_DEVICES = [
  { code: "FABA012DHH", name: "人工髖關節組（全套）", category: "骨科", price: 55000, selfPay: 35000, unit: "組", startDate: "2024-01-01", status: "給付中" },
  { code: "FBCA01BPNA", name: "冠狀動脈塗藥支架", category: "心臟科", price: 33000, selfPay: 45000, unit: "支", startDate: "2024-03-01", status: "給付中" },
  { code: "FABA022MHH", name: "人工膝關節組（全套）", category: "骨科", price: 58000, selfPay: 40000, unit: "組", startDate: "2024-01-01", status: "給付中" },
  { code: "FBZA01LENS", name: "人工水晶體（非球面）", category: "眼科", price: 2744, selfPay: 50000, unit: "片", startDate: "2024-06-01", status: "給付中" },
];

const MOCK_PAYMENTS = [
  { code: "01001C", name: "門診診察費（醫院）", category: "診察費", price: 316, unit: "點" },
  { code: "01004C", name: "急診診察費", category: "診察費", price: 571, unit: "點" },
  { code: "47013C", name: "一般傷口縫合", category: "處置費", price: 570, unit: "點" },
  { code: "62001B", name: "胸部 X 光（正面）", category: "檢查費", price: 200, unit: "點" },
  { code: "68032B", name: "全血球計數（CBC）", category: "檢驗費", price: 110, unit: "點" },
  { code: "68015B", name: "生化檢驗（肝功能）", category: "檢驗費", price: 80, unit: "點" },
];

const MOCK_CHANGES = [
  { id: 1, date: "2026-03-28", tableName: "drugs", itemCode: "AC49218100", itemName: "ASPIRIN TABLETS 100MG", changeType: "調價", field: "price", oldValue: "2.10", newValue: "1.87", tag: "降價" },
  { id: 2, date: "2026-03-28", tableName: "drugs", itemCode: "AC61234100", itemName: "ELIQUIS 5MG", changeType: "新增", field: null, oldValue: null, newValue: null, tag: "新藥" },
  { id: 3, date: "2026-03-27", tableName: "devices", itemCode: "FBZA01LENS", itemName: "人工水晶體（非球面）", changeType: "調價", field: "selfPay", oldValue: "45000", newValue: "50000", tag: "差額調整" },
  { id: 4, date: "2026-03-27", tableName: "drugs", itemCode: "BC22011100", itemName: "CRAVIT 500MG", changeType: "停用", field: "status", oldValue: "給付中", newValue: "停用", tag: "下架" },
  { id: 5, date: "2026-03-26", tableName: "payments", itemCode: "01001C", itemName: "門診診察費（醫院）", changeType: "調價", field: "price", oldValue: "310", newValue: "316", tag: "調升" },
  { id: 6, date: "2026-03-26", tableName: "drugs", itemCode: "AC55782221", itemName: "NEXIUM 40MG", changeType: "調價", field: "price", oldValue: "30.10", newValue: "28.30", tag: "降價" },
  { id: 7, date: "2026-03-25", tableName: "drugs", itemCode: "AC60150100", itemName: "PLAVIX 75MG TABLETS", changeType: "新增", field: null, oldValue: null, newValue: null, tag: "新藥" },
];

const SYNC_STATUS = { lastSync: "2026-03-28 07:04:23", status: "success", records: 18432, changes: 3 };

// ─── Icons (inline SVGs) ─────────────────────────────────
const icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="11" width="7" height="10" rx="1"/></svg>,
  pill: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h.008v.008H9.75v-.008zM15 18.75h.008v.008H15v-.008z"/></svg>,
  device: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  payment: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  changes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M7 17l5-5 5 5M7 7l5 5 5-5"/></svg>,
  down: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M7 7l5 5 5-5M7 17l5-5 5 5"/></svg>,
  sync: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><path d="M6 18L18 6M6 6l12 12"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M6 9l6 6 6-6"/></svg>,
  export: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>,
};

// ─── Utility Components ──────────────────────────────────
function Badge({ type, children }) {
  const colors = {
    "新增": "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "新藥": "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "調價": "bg-amber-50 text-amber-700 ring-amber-200",
    "降價": "bg-sky-50 text-sky-700 ring-sky-200",
    "調升": "bg-orange-50 text-orange-700 ring-orange-200",
    "差額調整": "bg-violet-50 text-violet-700 ring-violet-200",
    "停用": "bg-rose-50 text-rose-700 ring-rose-200",
    "下架": "bg-rose-50 text-rose-700 ring-rose-200",
    "給付中": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ring-1 ring-inset ${colors[type] || colors[children] || "bg-slate-50 text-slate-600 ring-slate-200"}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, accent, icon }) {
  const accents = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
    violet: "from-violet-500 to-violet-600",
  };
  return (
    <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow group">
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${accents[accent] || accents.blue}`}/>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className="flex-shrink-0 p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────
function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="藥品品項" value="18,432" sub="給付中" accent="blue" icon={icons.pill}/>
        <StatCard label="特材品項" value="3,856" sub="含差額負擔 892 項" accent="violet" icon={icons.device}/>
        <StatCard label="診療項目" value="5,214" sub="支付標準" accent="emerald" icon={icons.payment}/>
        <StatCard label="今日異動" value="3" sub="1 新增・1 調價・1 停用" accent="amber" icon={icons.changes}/>
      </div>

      {/* Two Column: Recent Changes + Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Changes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">近期異動紀錄</h3>
            <span className="text-xs text-slate-400">最近 7 天</span>
          </div>
          <div className="divide-y divide-slate-50">
            {MOCK_CHANGES.slice(0, 5).map(c => (
              <div key={c.id} className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${c.changeType === "新增" ? "bg-emerald-500" : c.changeType === "停用" ? "bg-rose-500" : "bg-amber-500"}`}/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 truncate">{c.itemName}</span>
                      <Badge type={c.tag}>{c.tag}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[11px]">{c.itemCode}</code>
                      <span>・</span>
                      <span>{c.date}</span>
                      {c.oldValue && c.newValue && (
                        <>
                          <span>・</span>
                          <span className="text-slate-500">{c.oldValue} → <span className="font-medium text-slate-700">{c.newValue}</span></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Status & Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">同步狀態</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">上次同步</span>
                <span className="text-sm text-slate-700 font-mono">{SYNC_STATUS.lastSync.split(" ")[1]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">狀態</span>
                <Badge type="給付中">同步成功</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">資料筆數</span>
                <span className="text-sm text-slate-700">{SYNC_STATUS.records.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">偵測異動</span>
                <span className="text-sm font-semibold text-amber-600">{SYNC_STATUS.changes} 筆</span>
              </div>
              <button className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                {icons.sync}
                手動同步
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">異動統計（本月）</h3>
            <div className="space-y-2.5">
              {[
                { label: "新增品項", count: 12, color: "bg-emerald-500" },
                { label: "價格異動", count: 28, color: "bg-amber-500" },
                { label: "停用品項", count: 5, color: "bg-rose-500" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.color}`}/>
                  <span className="text-sm text-slate-600 flex-1">{s.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Drug Search Page ────────────────────────────────────
function DrugsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [expandedCode, setExpandedCode] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const categories = ["全部", "口服", "注射", "外用"];
  const statuses = ["全部", "給付中", "停用"];

  const filtered = useMemo(() => {
    let result = MOCK_DRUGS.filter(d => {
      const q = search.toLowerCase();
      const matchSearch = !q || d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || (d.generic && d.generic.toLowerCase().includes(q));
      const matchCat = categoryFilter === "全部" || d.category === categoryFilter;
      const matchStatus = statusFilter === "全部" || d.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "price") cmp = a.price - b.price;
      else if (sortBy === "code") cmp = a.code.localeCompare(b.code);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [search, categoryFilter, statusFilter, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) => (
    <span className={`ml-1 inline-flex ${sortBy === field ? "text-blue-500" : "text-slate-300"}`}>
      {sortBy === field && sortDir === "desc" ? icons.down : icons.up}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">{icons.search}</div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋健保碼、藥品名稱、學名..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
            >
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
              {icons.export}
              <span className="hidden sm:inline">匯出</span>
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">共 {filtered.length} 筆結果</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("code")}>
                  健保碼<SortIcon field="code"/>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("name")}>
                  藥品名稱<SortIcon field="name"/>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap hidden md:table-cell">學名</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("price")}>
                  健保價<SortIcon field="price"/>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap hidden lg:table-cell">劑型</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(d => (
                <>
                  <tr
                    key={d.code}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => setExpandedCode(expandedCode === d.code ? null : d.code)}
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{d.code}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 max-w-[200px] sm:max-w-none truncate">{d.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{d.generic}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">${d.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-slate-500 hidden lg:table-cell">{d.form}</td>
                    <td className="px-4 py-3 text-center"><Badge type={d.status}>{d.status}</Badge></td>
                  </tr>
                  {expandedCode === d.code && (
                    <tr key={`${d.code}-detail`} className="bg-slate-50/50">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                          {[
                            ["規格含量", d.strength],
                            ["計價單位", `每${d.unit}`],
                            ["ATC 碼", d.atcCode],
                            ["製造商", d.manufacturer],
                            ["劑型", d.form],
                            ["類別", d.category],
                            ["生效日", d.startDate],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <span className="text-slate-400 text-xs">{k}</span>
                              <p className="text-slate-700 font-medium">{v || "—"}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Devices Page ────────────────────────────────────────
function DevicesPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_DEVICES.filter(d => {
    const q = search.toLowerCase();
    return !q || d.code.toLowerCase().includes(q) || d.name.includes(search) || (d.category && d.category.includes(search));
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200/80 p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">{icons.search}</div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋特材代碼、品名、科別..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(d => (
          <div key={d.code} className="bg-white rounded-xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-800">{d.name}</h4>
                <code className="text-xs font-mono text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded mt-1 inline-block">{d.code}</code>
              </div>
              <Badge type={d.status}>{d.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400 text-xs">科別</span>
                <p className="text-slate-700 font-medium">{d.category}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">計價單位</span>
                <p className="text-slate-700 font-medium">每{d.unit}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">健保給付價</span>
                <p className="text-lg font-bold text-blue-600">${d.price.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">差額負擔上限</span>
                <p className={`text-lg font-bold ${d.selfPay > 0 ? "text-amber-600" : "text-slate-400"}`}>
                  {d.selfPay > 0 ? `$${d.selfPay.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Payments Page ───────────────────────────────────────
function PaymentsPage() {
  const [search, setSearch] = useState("");
  const categories = [...new Set(MOCK_PAYMENTS.map(p => p.category))];
  const [catFilter, setCatFilter] = useState("全部");

  const filtered = MOCK_PAYMENTS.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.code.toLowerCase().includes(q) || p.name.includes(search);
    const matchCat = catFilter === "全部" || p.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">{icons.search}</div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋診療代碼、項目名稱..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["全部", ...categories].map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${catFilter === c ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">診療代碼</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">項目名稱</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">分類</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">支付點數</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(p => (
              <tr key={p.code} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{p.code}</code>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{p.category}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{p.price.toLocaleString()} 點</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Changes Page ────────────────────────────────────────
function ChangesPage() {
  const [typeFilter, setTypeFilter] = useState("全部");
  const types = ["全部", "新增", "調價", "停用"];

  const filtered = MOCK_CHANGES.filter(c => typeFilter === "全部" || c.changeType === typeFilter);
  const grouped = filtered.reduce((acc, c) => {
    if (!acc[c.date]) acc[c.date] = [];
    acc[c.date].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200/80 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 mr-2">篩選：</span>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${typeFilter === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{date}</h3>
              <span className="text-xs text-slate-400">{items.length} 筆異動</span>
            </div>
            <div className="divide-y divide-slate-50">
              {items.map(c => (
                <div key={c.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold
                      ${c.changeType === "新增" ? "bg-emerald-500" : c.changeType === "停用" ? "bg-rose-500" : "bg-amber-500"}`}>
                      {c.changeType === "新增" ? "＋" : c.changeType === "停用" ? "✕" : "△"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{c.itemName}</span>
                        <Badge type={c.tag}>{c.tag}</Badge>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                          {c.tableName === "drugs" ? "藥品" : c.tableName === "devices" ? "特材" : "診療"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[11px]">{c.itemCode}</code>
                        {c.oldValue && c.newValue && (
                          <span className="text-slate-500">
                            {c.field === "price" || c.field === "selfPay" ? "$" : ""}{c.oldValue}
                            <span className="mx-1">→</span>
                            <span className="font-semibold text-slate-700">{c.field === "price" || c.field === "selfPay" ? "$" : ""}{c.newValue}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────
export default function NHIWatch() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "總覽", icon: icons.dashboard },
    { id: "drugs", label: "藥品查詢", icon: icons.pill },
    { id: "devices", label: "特材查詢", icon: icons.device },
    { id: "payments", label: "診療支付", icon: icons.payment },
    { id: "changes", label: "異動紀錄", icon: icons.changes },
  ];

  const pageTitle = navItems.find(n => n.id === activePage)?.label || "";

  const navigate = (id) => {
    setActivePage(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]" style={{ fontFamily: "'Noto Sans TC', 'SF Pro Display', -apple-system, sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}/>
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200/80 z-50 transform transition-transform duration-200 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="h-16 px-5 flex items-center border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">NHI-Watch</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">健保給付查詢系統</p>
            </div>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            {icons.close}
          </button>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activePage === item.id
                  ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
            >
              <span className={activePage === item.id ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="text-[10px] text-slate-400 leading-relaxed">
            恆春旅遊醫院<br/>
            資料來源：健保署開放資料<br/>
            最後同步：{SYNC_STATUS.lastSync}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-60">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur-sm border-b border-slate-200/80 flex items-center px-4 lg:px-6">
          <button className="lg:hidden mr-3 text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(true)}>
            {icons.menu}
          </button>
          <h2 className="text-base font-semibold text-slate-800">{pageTitle}</h2>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="hidden sm:inline">已同步 {SYNC_STATUS.lastSync}</span>
            <span className="sm:hidden">已同步</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 max-w-7xl">
          {activePage === "dashboard" && <DashboardPage />}
          {activePage === "drugs" && <DrugsPage />}
          {activePage === "devices" && <DevicesPage />}
          {activePage === "payments" && <PaymentsPage />}
          {activePage === "changes" && <ChangesPage />}
        </main>
      </div>
    </div>
  );
}
