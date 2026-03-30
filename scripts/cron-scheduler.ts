import cron from "node-cron";
import { syncAll } from "../src/lib/sync-engine";
import { notifyChanges, notifyDailySummary } from "../src/lib/notify";

const SYNC_CRON = process.env.SYNC_CRON || "0 7 * * *";
const SUMMARY_CRON = process.env.SUMMARY_CRON || "30 7 * * *";

console.log("=== NHI-Watch 排程啟動 ===");
console.log(`同步排程: ${SYNC_CRON}`);
console.log(`摘要排程: ${SUMMARY_CRON}`);

// 每日 07:00 同步
cron.schedule(SYNC_CRON, async () => {
  console.log(`\n[${new Date().toISOString()}] 開始每日同步...`);
  try {
    const results = await syncAll();
    for (const r of results) {
      console.log(`  [${r.source}] ${r.status} — ${r.records} 筆, ${r.changes} 異動`);
    }
    await notifyChanges(results);
  } catch (err) {
    console.error("同步失敗:", err);
  }
});

// 每日 07:30 摘要
cron.schedule(SUMMARY_CRON, async () => {
  console.log(`\n[${new Date().toISOString()}] 發送每日摘要...`);
  try {
    await notifyDailySummary();
  } catch (err) {
    console.error("摘要發送失敗:", err);
  }
});

console.log("排程已啟動，等待執行...");
