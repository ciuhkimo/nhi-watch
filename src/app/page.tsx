"use client";

import { useState, useEffect } from "react";

interface Stats {
  drugCount: number;
  deviceCount: number;
  paymentCount: number;
  todayChanges: number;
  lastSync: {
    status: string;
    startedAt: string;
    finishedAt: string;
    records: number;
    changes: number;
  } | null;
}

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

const TABLE_LABELS: Record<string, string> = {
  drugs: "藥品",
  devices: "特材",
  payments: "診療",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, changesRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/changes?limit=5"),
      ]);
      const statsJson = await statsRes.json();
      const changesJson = await changesRes.json();
      if (statsJson.success) setStats(statsJson.data);
      if (changesJson.success) setChanges(changesJson.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      await loadData();
    } finally {
      setSyncing(false);
    }
  }

  const statCards = [
    {
      label: "藥品品項",
      value: stats?.drugCount.toLocaleString() ?? "—",
      sub: "給付中",
      accent: "from-blue-500 to-blue-600",
      icon: "💊",
    },
    {
      label: "特材品項",
      value: stats?.deviceCount.toLocaleString() ?? "—",
      sub: "含差額負擔",
      accent: "from-violet-500 to-violet-600",
      icon: "🩺",
    },
    {
      label: "診療項目",
      value: stats?.paymentCount.toLocaleString() ?? "—",
      sub: "支付標準",
      accent: "from-emerald-500 to-emerald-600",
      icon: "📋",
    },
    {
      label: "今日異動",
      value: stats?.todayChanges.toString() ?? "—",
      sub: "新增・調價・停用",
      accent: "from-amber-500 to-amber-600",
      icon: "🔔",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">總覽儀表板</h1>
        <p className="mt-1 text-slate-500 text-sm">NHI-Watch 健保給付查詢系統</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden bg-white rounded-xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow group"
          >
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${card.accent}`} />
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">
                  {loading ? "—" : card.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
              </div>
              <div className="flex-shrink-0 p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-colors text-lg">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 兩欄：近期異動 + 同步狀態 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 近期異動 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">近期異動紀錄</h3>
            <span className="text-xs text-slate-400">最近 5 筆</span>
          </div>
          {changes.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              尚無異動資料
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {changes.map((c) => (
                <div key={c.id} className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          c.changeType === "新增"
                            ? "bg-emerald-500"
                            : c.changeType === "停用"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {c.itemName}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ring-1 ring-inset ${
                            c.changeType === "新增"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : c.changeType === "停用"
                              ? "bg-rose-50 text-rose-700 ring-rose-200"
                              : "bg-amber-50 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {c.changeType}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[11px]">
                          {c.itemCode}
                        </code>
                        <span>·</span>
                        <span>{TABLE_LABELS[c.tableName] || c.tableName}</span>
                        <span>·</span>
                        <span>{c.date}</span>
                        {c.oldValue && c.newValue && (
                          <>
                            <span>·</span>
                            <span className="text-slate-500">
                              {c.oldValue} →{" "}
                              <span className="font-medium text-slate-700">{c.newValue}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 同步狀態 */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">同步狀態</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">上次同步</span>
                <span className="text-sm text-slate-700 font-mono">
                  {stats?.lastSync
                    ? new Date(stats.lastSync.startedAt).toLocaleTimeString("zh-TW")
                    : "尚未同步"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">狀態</span>
                {stats?.lastSync ? (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ring-1 ring-inset ${
                      stats.lastSync.status === "success"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}
                  >
                    {stats.lastSync.status === "success" ? "同步成功" : "同步失敗"}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">資料筆數</span>
                <span className="text-sm text-slate-700">
                  {stats?.lastSync?.records?.toLocaleString() ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">偵測異動</span>
                <span className="text-sm font-semibold text-amber-600">
                  {stats?.lastSync?.changes ?? "—"} 筆
                </span>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                >
                  <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {syncing ? "同步中..." : "手動同步"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
