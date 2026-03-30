"use client";

import { useState, useEffect, useCallback } from "react";

interface RegulationResult {
  drugCode: string;
  payCode: string;
  title: string;
  content: string;
  sourceUrl: string | null;
  drugName: string;
  drugPrice: number;
  highlight: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function RegulationsPage() {
  const [results, setResults] = useState<RegulationResult[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fetchResults = useCallback(async (page: number) => {
    if (!search.trim()) {
      setResults([]);
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/regulations/search?${params}`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        fetchResults(1);
      } else {
        setResults([]);
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchResults]);

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">給付規定查詢</h1>
        <p className="mt-1 text-slate-500 text-sm">搜尋藥品給付規定全文，查找適應症、使用限制與給付條件</p>
      </div>

      {/* 搜尋框 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4">
        <div className="relative">
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
            placeholder="搜尋給付規定（如：糖尿病、抗凝血、限用於...）"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition"
          />
        </div>
        {search.trim() && (
          <div className="mt-2 text-xs text-slate-400">
            {loading ? "搜尋中..." : `找到 ${pagination.total.toLocaleString()} 筆結果`}
          </div>
        )}
        {!search.trim() && (
          <div className="mt-2 text-xs text-slate-400">
            請輸入關鍵字搜尋藥品給付規定全文
          </div>
        )}
      </div>

      {/* 搜尋結果 */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, idx) => (
            <div
              key={`${r.drugCode}-${r.payCode}-${idx}`}
              className="bg-white rounded-xl border border-slate-200/80 overflow-hidden"
            >
              {/* 結果標頭 */}
              <div
                className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                        {r.drugCode}
                      </code>
                      {r.payCode && r.payCode !== "unknown" && (
                        <span className="text-xs text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded shrink-0">
                          {r.payCode}
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {r.drugName}
                      </span>
                    </div>
                    {r.title && (
                      <p className="mt-1 text-xs text-slate-500 truncate">{r.title}</p>
                    )}
                    {/* 摘要（含高亮） */}
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      <HighlightText text={r.highlight} query={search} />
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-mono font-semibold text-slate-700">
                      ${r.drugPrice.toFixed(2)}
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${expandedIdx === idx ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 展開全文 */}
              {expandedIdx === idx && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700">給付規定全文</h4>
                    {r.sourceUrl && (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        原始連結
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                    <HighlightText text={r.content} query={search} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 空狀態 */}
      {!loading && search.trim() && results.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <p className="text-slate-400">找不到符合「{search}」的給付規定</p>
          <p className="text-xs text-slate-300 mt-2">
            請確認已執行給付規定同步（npx tsx scripts/sync-regulations.ts）
          </p>
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
              onClick={() => fetchResults(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              上一頁
            </button>
            <button
              onClick={() => fetchResults(pagination.page + 1)}
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

/**
 * 高亮顯示搜尋關鍵字
 */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;

  const parts: Array<{ text: string; highlighted: boolean }> = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;

  while (true) {
    const idx = lowerText.indexOf(lowerQuery, lastIndex);
    if (idx === -1) break;
    if (idx > lastIndex) {
      parts.push({ text: text.substring(lastIndex, idx), highlighted: false });
    }
    parts.push({ text: text.substring(idx, idx + query.length), highlighted: true });
    lastIndex = idx + query.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlighted: false });
  }

  if (parts.length === 0) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="bg-amber-200/70 text-amber-900 rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}
