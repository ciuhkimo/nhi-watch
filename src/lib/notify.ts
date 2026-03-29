import { prisma } from "./db";

const LINE_NOTIFY_URL = "https://notify-api.line.me/api/notify";

/**
 * 發送 LINE Notify 訊息
 */
async function sendLineNotify(message: string): Promise<boolean> {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token || token === "your-token-here") {
    console.log("[LINE Notify] 未設定 token，跳過推播");
    console.log("[LINE Notify] 訊息內容:", message);
    return false;
  }

  try {
    const res = await fetch(LINE_NOTIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    });

    if (!res.ok) {
      console.error(`[LINE Notify] 發送失敗: ${res.status} ${res.statusText}`);
      return false;
    }

    console.log("[LINE Notify] 發送成功");
    return true;
  } catch (error) {
    console.error("[LINE Notify] 發送錯誤:", error);
    return false;
  }
}

/**
 * 即時異動推播（同步完成後立即發送）
 */
export async function notifyChanges(
  results: { source: string; status: string; records: number; changes: number; errorMsg?: string }[]
): Promise<void> {
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
  if (totalChanges === 0) return;

  const lines = ["\n【NHI-Watch 異動通知】"];
  for (const r of results) {
    if (r.changes > 0) {
      lines.push(`${r.source === "drugs" ? "藥品" : "診療"}：${r.changes} 筆異動`);
    }
  }
  lines.push(`\n請至系統查看詳情`);

  await sendLineNotify(lines.join("\n"));
}

/**
 * 每日摘要推播（07:30 發送前一天統計）
 */
export async function notifyDailySummary(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const [drugCount, deviceCount, paymentCount, todayChanges, lastSync] =
    await Promise.all([
      prisma.drug.count({ where: { status: "給付中" } }),
      prisma.device.count(),
      prisma.payment.count(),
      prisma.changeLog.count({ where: { date: today } }),
      prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } }),
    ]);

  // 取得今日各類異動數
  const changesByType = await prisma.changeLog.groupBy({
    by: ["changeType"],
    where: { date: today },
    _count: true,
  });

  const changeMap = Object.fromEntries(
    changesByType.map((c) => [c.changeType, c._count])
  );

  const lines = [
    "\n【NHI-Watch 每日摘要】",
    `日期：${today}`,
    "",
    `藥品品項：${drugCount.toLocaleString()} 項`,
    `特材品項：${deviceCount.toLocaleString()} 項`,
    `診療項目：${paymentCount.toLocaleString()} 項`,
    "",
    `今日異動：${todayChanges} 筆`,
  ];

  if (todayChanges > 0) {
    if (changeMap["新增"]) lines.push(`  新增：${changeMap["新增"]} 筆`);
    if (changeMap["調價"]) lines.push(`  調價：${changeMap["調價"]} 筆`);
    if (changeMap["停用"]) lines.push(`  停用：${changeMap["停用"]} 筆`);
  }

  if (lastSync) {
    lines.push(`\n上次同步：${lastSync.status === "success" ? "成功" : "失敗"}`);
  }

  await sendLineNotify(lines.join("\n"));
}
