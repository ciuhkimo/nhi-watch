import { prisma } from "./db";
import { fetchAllDrugs, fetchPayments } from "./nhi-api";
import { detectDrugChanges, detectPaymentChanges, saveChanges } from "./diff-detector";

interface SyncResult {
  source: string;
  status: "success" | "failed";
  records: number;
  changes: number;
  duration: number;
  errorMsg?: string;
}

/**
 * 同步藥品資料
 */
export async function syncDrugs(): Promise<SyncResult> {
  const startedAt = new Date();

  try {
    // 1. 抓取所有藥品
    const drugs = await fetchAllDrugs();

    // 2. 偵測異動
    const changes = await detectDrugChanges(
      drugs.map((d) => ({
        code: d.code,
        name: d.name,
        price: d.price,
        endDate: d.endDate,
      }))
    );

    // 3. 寫入異動紀錄
    const changeCount = await saveChanges("drugs", changes);

    // 4. 批次 upsert 藥品資料
    for (const drug of drugs) {
      await prisma.drug.upsert({
        where: { code: drug.code },
        update: {
          name: drug.name,
          generic: drug.generic,
          form: drug.form,
          strength: drug.strength,
          price: drug.price,
          unit: drug.unit,
          atcCode: drug.atcCode,
          manufacturer: drug.manufacturer,
          category: drug.category,
          startDate: drug.startDate,
          endDate: drug.endDate,
          status: drug.endDate ? "停用" : "給付中",
        },
        create: {
          code: drug.code,
          name: drug.name,
          generic: drug.generic,
          form: drug.form,
          strength: drug.strength,
          price: drug.price,
          unit: drug.unit,
          atcCode: drug.atcCode,
          manufacturer: drug.manufacturer,
          category: drug.category,
          startDate: drug.startDate,
          endDate: drug.endDate,
          status: drug.endDate ? "停用" : "給付中",
        },
      });
    }

    // 5. 標記不在新資料中的品項為停用
    const incomingCodes = drugs.map((d) => d.code);
    if (incomingCodes.length > 0) {
      await prisma.drug.updateMany({
        where: {
          code: { notIn: incomingCodes },
          status: "給付中",
        },
        data: { status: "停用" },
      });
    }

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startedAt.getTime();

    // 6. 寫入同步紀錄
    await prisma.syncLog.create({
      data: {
        source: "drugs",
        status: "success",
        records: drugs.length,
        changes: changeCount,
        startedAt,
        finishedAt,
      },
    });

    return {
      source: "drugs",
      status: "success",
      records: drugs.length,
      changes: changeCount,
      duration,
    };
  } catch (error) {
    const finishedAt = new Date();
    const errorMsg = error instanceof Error ? error.message : "未知錯誤";

    await prisma.syncLog.create({
      data: {
        source: "drugs",
        status: "failed",
        records: 0,
        changes: 0,
        startedAt,
        finishedAt,
        errorMsg,
      },
    });

    return {
      source: "drugs",
      status: "failed",
      records: 0,
      changes: 0,
      duration: finishedAt.getTime() - startedAt.getTime(),
      errorMsg,
    };
  }
}

/**
 * 同步診療支付標準
 */
export async function syncPayments(): Promise<SyncResult> {
  const startedAt = new Date();

  try {
    const payments = await fetchPayments();

    const changes = await detectPaymentChanges(
      payments.map((p) => ({
        code: p.code,
        name: p.name,
        price: p.price,
      }))
    );

    const changeCount = await saveChanges("payments", changes);

    for (const payment of payments) {
      await prisma.payment.upsert({
        where: { code: payment.code },
        update: {
          name: payment.name,
          category: payment.category,
          price: payment.price,
          unit: payment.unit,
          startDate: payment.startDate,
        },
        create: {
          code: payment.code,
          name: payment.name,
          category: payment.category,
          price: payment.price,
          unit: payment.unit,
          startDate: payment.startDate,
        },
      });
    }

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startedAt.getTime();

    await prisma.syncLog.create({
      data: {
        source: "payments",
        status: "success",
        records: payments.length,
        changes: changeCount,
        startedAt,
        finishedAt,
      },
    });

    return {
      source: "payments",
      status: "success",
      records: payments.length,
      changes: changeCount,
      duration,
    };
  } catch (error) {
    const finishedAt = new Date();
    const errorMsg = error instanceof Error ? error.message : "未知錯誤";

    await prisma.syncLog.create({
      data: {
        source: "payments",
        status: "failed",
        records: 0,
        changes: 0,
        startedAt,
        finishedAt,
        errorMsg,
      },
    });

    return {
      source: "payments",
      status: "failed",
      records: 0,
      changes: 0,
      duration: finishedAt.getTime() - startedAt.getTime(),
      errorMsg,
    };
  }
}

/**
 * 執行全部同步（藥品 + 診療支付）
 */
export async function syncAll(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  results.push(await syncDrugs());
  results.push(await syncPayments());
  return results;
}
