import { syncAll } from "../src/lib/sync-engine";
import { notifyChanges, notifyDailySummary } from "../src/lib/notify";

async function main() {
  console.log("=== NHI-Watch 每日同步 ===");
  console.log(`開始時間: ${new Date().toISOString()}`);

  const results = await syncAll();

  for (const result of results) {
    console.log(`\n[${result.source}]`);
    console.log(`  狀態: ${result.status}`);
    console.log(`  筆數: ${result.records}`);
    console.log(`  異動: ${result.changes}`);
    console.log(`  耗時: ${result.duration}ms`);
    if (result.errorMsg) {
      console.error(`  錯誤: ${result.errorMsg}`);
    }
  }

  // 發送即時異動通知
  await notifyChanges(results);

  console.log(`\n完成時間: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("同步失敗:", err);
  process.exit(1);
});

// 每日摘要推播（可由獨立 cron 呼叫）
export { notifyDailySummary };
