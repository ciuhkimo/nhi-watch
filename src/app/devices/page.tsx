"use client";

import { useState, useEffect, useCallback } from "react";

interface Device {
  id: number;
  code: string;
  name: string;
  category: string | null;
  price: number;
  selfPay: number;
  unit: string | null;
  startDate: string | null;
  status: string;
  note: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [categories, setCategories] = useState<string[]>([]);

  const fetchDevices = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "全部") params.set("category", category);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/devices?${params}`);
      const json = await res.json();
      if (json.success) {
        setDevices(json.data);
        setPagination(json.pagination);
        // 從首次載入資料中提取科別清單
        if (categories.length === 0 && json.data.length > 0) {
          const cats = Array.from(new Set(json.data.map((d: Device) => d.category).filter(Boolean))) as string[];
          setCategories(cats.sort());
        }
      }
    } finally {
      setLoading(false);
    }
  }, [search, category, categories.length]);

  useEffect(() => {
    const timer = setTimeout(() => fetchDevices(1), 300);
    return () => clearTimeout(timer);
  }, [fetchDevices]);

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">特材查詢</h1>
        <p className="mt-1 text-slate-500 text-sm">搜尋健保特殊材料給付項目</p>
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
              placeholder="搜尋特材代碼、品名、科別..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {["全部", ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                    category === c
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-400">
          共 {pagination.total.toLocaleString()} 筆結果
        </div>
      </div>

      {/* 卡片列表 */}
      {loading && devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400">
          載入中...
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400">
          {search || category !== "全部"
            ? "找不到符合條件的特材"
            : "尚無特材資料，請先執行同步"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((d) => (
            <DeviceCard key={d.code} device={d} />
          ))}
        </div>
      )}

      {/* 分頁 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            第 {pagination.page} / {pagination.totalPages} 頁
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDevices(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              上一頁
            </button>
            <button
              onClick={() => fetchDevices(pagination.page + 1)}
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

/* ── 特材卡片 ── */
function DeviceCard({ device: d }: { device: Device }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 mr-3">
          <h4 className="font-semibold text-slate-800 truncate">{d.name}</h4>
          <code className="text-xs font-mono text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded mt-1 inline-block">
            {d.code}
          </code>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-400 text-xs">科別</span>
          <p className="text-slate-700 font-medium">{d.category || "—"}</p>
        </div>
        <div>
          <span className="text-slate-400 text-xs">計價單位</span>
          <p className="text-slate-700 font-medium">{d.unit ? `每${d.unit}` : "—"}</p>
        </div>
        <div>
          <span className="text-slate-400 text-xs">健保給付價</span>
          <p className="text-lg font-bold text-blue-600">
            ${d.price.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-slate-400 text-xs">差額負擔上限</span>
          <p className={`text-lg font-bold ${d.selfPay > 0 ? "text-amber-600" : "text-slate-400"}`}>
            {d.selfPay > 0 ? `$${d.selfPay.toLocaleString()}` : "—"}
          </p>
        </div>
      </div>
      {d.startDate && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
          生效日：{d.startDate}
        </div>
      )}
    </div>
  );
}
