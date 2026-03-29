"use client";

import { useState, useEffect, useCallback } from "react";
import { exportToExcel } from "@/lib/export-excel";

interface Drug {
  id: number;
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
  status: string;
  note: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortField = "code" | "name" | "price";
type SortDir = "asc" | "desc";

const CATEGORIES = ["全部", "口服", "注射", "外用"];
const STATUSES = ["全部", "給付中", "停用"];

export default function DrugsPage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [status, setStatus] = useState("全部");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const fetchDrugs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "全部") params.set("category", category);
      if (status !== "全部") params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/drugs?${params}`);
      const json = await res.json();
      if (json.success) {
        setDrugs(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, category, status]);

  // 搜尋/篩選變更時重新載入第 1 頁
  useEffect(() => {
    const timer = setTimeout(() => fetchDrugs(1), 300);
    return () => clearTimeout(timer);
  }, [fetchDrugs]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // 前端排序（已取得的當頁資料）
  const sorted = [...drugs].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "price") cmp = a.price - b.price;
    else if (sortBy === "code") cmp = a.code.localeCompare(b.code);
    return sortDir === "desc" ? -cmp : cmp;
  });

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">藥品查詢</h1>
        <p className="mt-1 text-slate-500 text-sm">搜尋健保藥品品項、藥價、ATC 碼</p>
      </div>

      {/* 搜尋與篩選 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋健保碼、藥品名稱、學名..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
              onClick={() =>
                exportToExcel(
                  sorted as unknown as Record<string, unknown>[],
                  [
                    { key: "code", label: "健保碼" },
                    { key: "name", label: "藥品名稱" },
                    { key: "generic", label: "學名" },
                    { key: "price", label: "健保價" },
                    { key: "form", label: "劑型" },
                    { key: "category", label: "類別" },
                    { key: "atcCode", label: "ATC碼" },
                    { key: "manufacturer", label: "製造商" },
                    { key: "status", label: "狀態" },
                  ],
                  "藥品查詢"
                )
              }
              disabled={sorted.length === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
                <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span className="hidden sm:inline">匯出</span>
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          共 {pagination.total.toLocaleString()} 筆結果
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th
                  className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("code")}
                >
                  健保碼
                  <SortIcon field="code" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("name")}
                >
                  藥品名稱
                  <SortIcon field="name" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap hidden md:table-cell">
                  學名
                </th>
                <th
                  className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("price")}
                >
                  健保價
                  <SortIcon field="price" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap hidden lg:table-cell">
                  劑型
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  狀態
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && drugs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    載入中...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {search || category !== "全部" || status !== "全部"
                      ? "找不到符合條件的藥品"
                      : "尚無藥品資料，請先執行同步"}
                  </td>
                </tr>
              ) : (
                sorted.map((d) => (
                  <DrugRow
                    key={d.code}
                    drug={d}
                    expanded={expandedCode === d.code}
                    onToggle={() =>
                      setExpandedCode(expandedCode === d.code ? null : d.code)
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分頁 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            第 {pagination.page} / {pagination.totalPages} 頁
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDrugs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              上一頁
            </button>
            <button
              onClick={() => fetchDrugs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 排序圖示 ── */
function SortIcon({
  field,
  sortBy,
  sortDir,
}: {
  field: SortField;
  sortBy: SortField;
  sortDir: SortDir;
}) {
  const active = sortBy === field;
  return (
    <span className={`ml-1 inline-flex ${active ? "text-blue-500" : "text-slate-300"}`}>
      {active && sortDir === "desc" ? "↓" : "↑"}
    </span>
  );
}

/* ── 狀態 Badge ── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    給付中: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    停用: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ring-1 ring-inset ${
        colors[status] || "bg-slate-50 text-slate-600 ring-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

/* ── 藥品列（含展開詳情） ── */
function DrugRow({
  drug: d,
  expanded,
  onToggle,
}: {
  drug: Drug;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-blue-50/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            {d.code}
          </code>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800 max-w-[200px] sm:max-w-none truncate">
            {d.name}
          </div>
        </td>
        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
          {d.generic || "—"}
        </td>
        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
          ${d.price.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-center text-slate-500 hidden lg:table-cell">
          {d.form || "—"}
        </td>
        <td className="px-4 py-3 text-center">
          <StatusBadge status={d.status} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              {(
                [
                  ["規格含量", d.strength],
                  ["計價單位", d.unit ? `每${d.unit}` : null],
                  ["ATC 碼", d.atcCode],
                  ["製造商", d.manufacturer],
                  ["劑型", d.form],
                  ["類別", d.category],
                  ["生效日", d.startDate],
                ] as [string, string | null][]
              ).map(([label, value]) => (
                <div key={label}>
                  <span className="text-slate-400 text-xs">{label}</span>
                  <p className="text-slate-700 font-medium">{value || "—"}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
