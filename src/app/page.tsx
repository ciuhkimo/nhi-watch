export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">總覽儀表板</h1>
      <p className="mt-2 text-slate-500">歡迎使用 NHI-Watch 健保給付查詢系統</p>

      {/* 統計卡片 - Session 8 實作 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["藥品品項數", "特材品項數", "診療項目數", "今日異動數"].map((label) => (
          <div
            key={label}
            className="rounded-xl border-l-4 border-l-blue-500 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">—</p>
          </div>
        ))}
      </div>

      {/* 近期異動 + 同步狀態 - Session 8 實作 */}
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">近期異動</h2>
        <p className="mt-4 text-center text-slate-400">尚無異動資料</p>
      </div>
    </div>
  );
}
