/**
 * 回填藥價歷史資料
 * 從 ChangeLog 中提取調價紀錄，並為所有現有藥品建立初始價格點
 *
 * 執行方式：npx tsx scripts/backfill-price-history.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfill() {
  console.log("開始回填藥價歷史...");

  // 1. 從 ChangeLog 提取調價紀錄（含舊價格）
  const priceChanges = await prisma.changeLog.findMany({
    where: {
      tableName: "drugs",
      changeType: "調價",
      field: "price",
    },
    orderBy: { date: "asc" },
  });

  console.log(`找到 ${priceChanges.length} 筆調價紀錄`);

  // 為每筆調價紀錄建立兩個價格點：調價前（oldValue）和調價後（newValue）
  const entries: { drugCode: string; price: number; date: string }[] = [];
  const seen = new Set<string>(); // drugCode:date:price 去重

  for (const change of priceChanges) {
    if (change.oldValue) {
      const key = `${change.itemCode}:${change.date}:old:${change.oldValue}`;
      if (!seen.has(key)) {
        seen.add(key);
        // 舊價格的日期設為調價日前一天（表示調價前的價格）
        const prevDate = getPrevDate(change.date);
        entries.push({
          drugCode: change.itemCode,
          price: parseFloat(change.oldValue),
          date: prevDate,
        });
      }
    }
    if (change.newValue) {
      const key = `${change.itemCode}:${change.date}:new:${change.newValue}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({
          drugCode: change.itemCode,
          price: parseFloat(change.newValue),
          date: change.date,
        });
      }
    }
  }

  // 2. 為所有現有藥品建立「目前價格」的記錄點
  const drugs = await prisma.drug.findMany({
    select: { code: true, price: true },
  });

  const today = new Date().toISOString().split("T")[0];
  const existingHistoryCodes = new Set(entries.map((e) => e.drugCode));

  for (const drug of drugs) {
    // 只為沒有歷史紀錄的藥品建立初始點
    if (!existingHistoryCodes.has(drug.code)) {
      entries.push({
        drugCode: drug.code,
        price: drug.price,
        date: today,
      });
    }
  }

  // 3. 清除既有 PriceHistory 後寫入
  await prisma.priceHistory.deleteMany({});

  if (entries.length > 0) {
    // SQLite 有 SQLITE_MAX_VARIABLE_NUMBER 限制，分批寫入
    const BATCH_SIZE = 500;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      await prisma.priceHistory.createMany({
        data: entries.slice(i, i + BATCH_SIZE),
      });
    }
  }

  console.log(`已寫入 ${entries.length} 筆藥價歷史紀錄`);
  console.log(`  - 從調價紀錄回填: ${entries.length - (drugs.length - existingHistoryCodes.size)} 筆`);
  console.log(`  - 現有藥品初始點: ${drugs.length - existingHistoryCodes.size} 筆`);
}

function getPrevDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
