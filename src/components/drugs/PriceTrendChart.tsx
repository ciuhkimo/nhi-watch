"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PricePoint {
  date: string;
  price: number;
}

export default function PriceTrendChart({ drugCode }: { drugCode: string }) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/drugs/${encodeURIComponent(drugCode)}/price-history`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data.history);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [drugCode]);

  if (loading) {
    return (
      <div className="mt-4 h-48 animate-pulse bg-slate-100 rounded-lg" />
    );
  }

  if (data.length < 2) {
    return (
      <p className="mt-3 text-sm text-slate-400">
        尚無足夠的歷史藥價資料以繪製趨勢圖
      </p>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-2">
        歷史藥價趨勢
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${v}`}
            width={60}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "健保價"]}
            labelFormatter={(label) => `日期：${label}`}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
          />
          <Line
            type="stepAfter"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#3b82f6" }}
            activeDot={{ r: 6, fill: "#2563eb" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
