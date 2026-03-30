import { prisma } from "./db";
import { fetchAllDrugs, fetchAllDevices, fetchPayments } from "./nhi-api";
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

    // 3b. 記錄藥價歷史（新增與調價品項）
    const priceChangeItems = changes.filter(
      (c) => c.changeType === "調價" || c.changeType === "新增"
    );
    if (priceChangeItems.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const drugPriceMap = new Map(drugs.map((d) => [d.code, d.price]));
      await prisma.priceHistory.createMany({
        skipDuplicates: true,
        data: priceChangeItems
          .filter((c) => drugPriceMap.has(c.itemCode))
          .map((c) => ({
            drugCode: c.itemCode,
            price: drugPriceMap.get(c.itemCode)!,
            date: today,
          })),
      });
    }

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
          regulationUrl: drug.regulationUrl,
          status: drug.endDate && drug.endDate < new Date().toISOString().split("T")[0] ? "停用" : "給付中",
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
          regulationUrl: drug.regulationUrl,
          status: drug.endDate && drug.endDate < new Date().toISOString().split("T")[0] ? "停用" : "給付中",
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
 * 同步特材品項（從健保署 INAE2000 API 爬取）
 */
export async function syncDevices(): Promise<SyncResult> {
  const startedAt = new Date();

  try {
    const devices = await fetchAllDevices();

    let changeCount = 0;

    for (const device of devices) {
      // 偵測是否為新增
      const existing = await prisma.device.findUnique({
        where: { code: device.code },
        select: { price: true },
      });

      if (!existing) {
        changeCount++;
      } else if (existing.price !== device.price) {
        changeCount++;
      }

      await prisma.device.upsert({
        where: { code: device.code },
        update: {
          name: device.name,
          category: device.category,
          price: device.price,
          selfPay: device.selfPay,
          unit: device.unit,
          startDate: device.startDate,
          status: "給付中",
        },
        create: {
          code: device.code,
          name: device.name,
          category: device.category,
          price: device.price,
          selfPay: device.selfPay,
          unit: device.unit,
          startDate: device.startDate,
          status: "給付中",
        },
      });
    }

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startedAt.getTime();

    await prisma.syncLog.create({
      data: {
        source: "devices",
        status: "success",
        records: devices.length,
        changes: changeCount,
        startedAt,
        finishedAt,
      },
    });

    return {
      source: "devices",
      status: "success",
      records: devices.length,
      changes: changeCount,
      duration,
    };
  } catch (error) {
    const finishedAt = new Date();
    const errorMsg = error instanceof Error ? error.message : "未知錯誤";

    await prisma.syncLog.create({
      data: {
        source: "devices",
        status: "failed",
        records: 0,
        changes: 0,
        startedAt,
        finishedAt,
        errorMsg,
      },
    });

    return {
      source: "devices",
      status: "failed",
      records: 0,
      changes: 0,
      duration: finishedAt.getTime() - startedAt.getTime(),
      errorMsg,
    };
  }
}

/**
 * 執行全部同步（藥品 + 特材 + 診療支付）
 */
export async function syncAll(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  results.push(await syncDrugs());
  results.push(await syncDevices());
  results.push(await syncPayments());
  return results;
}
