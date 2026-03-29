"use client";

import { useState, useEffect, useCallback } from "react";

interface Payment {
  id: number;
  code: string;
  name: string;
  category: string | null;
  price: number;
  unit: string | null;
  startDate: string | null;
  note: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [categories, setCategories] = useState<string[]>([]);

  // 初次載入時取得分類清單（取大量資料提取不重複分類）
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/payments?limit=100&page=1");
        const json = await res.json();
        if (json.success) {
          const cats = Array.from(
            new Set(json.data.map((p: Payment) => p.category).filter(Boolean))
          ) as string[];
          setCategories(cats.sort());
        }
      } catch {
        // 靜默失敗，分類篩選不可用而已
      }
    }
    loadCategories();
  }, []);

  const fetchPayments = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "全部") params.set("category", category);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/payments?${params}`);
      const json = await res.json();
      if (json.success) {
        setPayments(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPayments(1), 300);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">診療支付查詢</h1>
        <p className="mt-1 text-slate-500 text-sm">搜尋健保診療支付標準與點數</p>
      </div>

      {/* 搜尋與分類篩選 */}
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
              placeholder="搜尋診療代碼、項目名稱..."
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

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  診療代碼
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  項目名稱
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap hidden sm:table-cell">
                  分類
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  支付點數
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    載入中...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    {search || category !== "全部"
                      ? "找不到符合條件的診療項目"
                      : "尚無診療支付資料，請先執行同步"}
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.code}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {p.code}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {p.category && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {p.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      {p.price.toLocaleString()} 點
                    </td>
                  </tr>
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
              onClick={() => fetchPayments(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              上一頁
            </button>
            <button
              onClick={() => fetchPayments(pagination.page + 1)}
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
