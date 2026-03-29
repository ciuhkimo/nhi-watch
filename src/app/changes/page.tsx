"use client";

import { useState, useEffect, useCallback } from "react";

interface ChangeRecord {
  id: number;
  date: string;
  tableName: string;
  itemCode: string;
  itemName: string;
  changeType: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPES = ["全部", "新增", "調價", "停用"];

const TABLE_LABELS: Record<string, string> = {
  drugs: "藥品",
  devices: "特材",
  payments: "診療",
};

export default function ChangesPage() {
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 50, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("全部");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchChanges = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "全部") params.set("type", typeFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(`/api/changes?${params}`);
      const json = await res.json();
      if (json.success) {
        setChanges(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchChanges(1);
  }, [fetchChanges]);

  // 按日期分組
  const grouped = changes.reduce<Record<string, ChangeRecord[]>>((acc, c) => {
    if (!acc[c.date]) acc[c.date] = [];
    acc[c.date].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">異動紀錄</h1>
        <p className="mt-1 text-slate-500 text-sm">查看健保給付異動歷史（新增、調價、停用）</p>
      </div>

      {/* 篩選 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">類型：</span>
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                  typeFilter === t
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">日期：</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="text-xs text-slate-400">至</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
              >
                清除
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          共 {pagination.total.toLocaleString()} 筆異動
        </div>
      </div>

      {/* 時間軸 */}
      {loading && changes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400">
          載入中...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400">
          {typeFilter !== "全部" ? "找不到符合條件的異動紀錄" : "尚無異動紀錄，請先執行同步"}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{date}</h3>
                <span className="text-xs text-slate-400">{items.length} 筆異動</span>
              </div>
              <div className="divide-y divide-slate-50">
                {items.map((c) => (
                  <ChangeItem key={c.id} change={c} />
                ))}
              </div>
            </div>
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
              onClick={() => fetchChanges(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              上一頁
            </button>
            <button
              onClick={() => fetchChanges(pagination.page + 1)}
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

/* ── 異動項目 ── */
function ChangeItem({ change: c }: { change: ChangeRecord }) {
  const iconStyle: Record<string, string> = {
    新增: "bg-emerald-500",
    調價: "bg-amber-500",
    停用: "bg-rose-500",
  };
  const iconText: Record<string, string> = {
    新增: "＋",
    調價: "△",
    停用: "✕",
  };
  const badgeStyle: Record<string, string> = {
    新增: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    調價: "bg-amber-50 text-amber-700 ring-amber-200",
    停用: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <div className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
            iconStyle[c.changeType] || "bg-slate-400"
          }`}
        >
          {iconText[c.changeType] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{c.itemName}</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ring-1 ring-inset ${
                badgeStyle[c.changeType] || "bg-slate-50 text-slate-600 ring-slate-200"
              }`}
            >
              {c.changeType}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
              {TABLE_LABELS[c.tableName] || c.tableName}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[11px]">
              {c.itemCode}
            </code>
            {c.oldValue && c.newValue && (
              <span className="text-slate-500">
                {c.field === "price" || c.field === "selfPay" ? "$" : ""}
                {c.oldValue}
                <span className="mx-1">→</span>
                <span className="font-semibold text-slate-700">
                  {c.field === "price" || c.field === "selfPay" ? "$" : ""}
                  {c.newValue}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
