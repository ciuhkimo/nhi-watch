/**
 * 同步藥品給付規定
 * 從有 regulationUrl 的藥品逐筆下載給付規定全文
 *
 * 執行方式：npx tsx scripts/sync-regulations.ts
 * 選項：
 *   --force    強制重新抓取所有（包含已有紀錄的）
 *   --limit=N  限制最多抓取 N 筆（預設 500）
 */
import { syncRegulations } from "../src/lib/regulation-search";

const args = process.argv.slice(2);
const forceUpdate = args.includes("--force");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 500;

async function main() {
  console.log(`開始同步藥品給付規定...`);
  console.log(`  forceUpdate: ${forceUpdate}`);
  console.log(`  limit: ${limit}`);

  const result = await syncRegulations({ limit, forceUpdate });

  console.log(`\n同步完成：`);
  console.log(`  已抓取: ${result.fetched} 筆`);
  console.log(`  已儲存: ${result.saved} 筆`);
  console.log(`  失敗: ${result.errors} 筆`);
}

main().catch(console.error);
