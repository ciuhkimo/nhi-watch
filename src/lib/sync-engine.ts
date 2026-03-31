import { prisma } from "./db";
import { fetchDrugs, fetchAllDevices, fetchPayments } from "./nhi-api";
import { detectDeviceChanges, detectPaymentChanges, saveChanges } from "./diff-detector";

const BATCH_SIZE = 50;

interface SyncResult {
  source: string;
  status: "success" | "failed";
  records: number;
  changes: number;
  duration: number;
  errorMsg?: string;
}

/**
 * 同步藥品資料（低記憶體模式：逐頁抓取、小批寫入）
 */
export async function syncDrugs(): Promise<SyncResult> {
  const startedAt = new Date();
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

  try {
    // 檢查是否為首次同步（DB 空的就跳過異動偵測）
    const existingCount = await prisma.drug.count();
    const isFirstSync = existingCount === 0;

    // 非首次同步才載入現有資料做 diff
    let existingMap: Map<string, { code: string; price: number }> | null = null;
    if (!isFirstSync) {
      const existing = await prisma.drug.findMany({
        select: { code: true, price: true },
      });
      existingMap = new Map(existing.map((d) => [d.code, d]));
    }

    let totalRecords = 0;
    let changeCount = 0;
    let offset = 0;
    const limit = 500;

    while (true) {
      const { records: drugs } = await fetchDrugs(limit, offset);
      if (drugs.length === 0) break;

      // 非首次同步：偵測異動
      if (existingMap) {
        const changes: { changeType: string; itemCode: string; itemName: string; field?: string; oldValue?: string; newValue?: string }[] = [];
        for (const drug of drugs) {
          const old = existingMap.get(drug.code);
          if (!old) {
            changes.push({ changeType: "新增", itemCode: drug.code, itemName: drug.name });
          } else if (old.price !== drug.price) {
            changes.push({
              changeType: "調價", itemCode: drug.code, itemName: drug.name,
              field: "price", oldValue: old.price.toString(), newValue: drug.price.toString(),
            });
          }
        }
        if (changes.length > 0) {
          await prisma.changeLog.createMany({
            data: changes.map((c) => ({
              date: today, tableName: "drugs" as const,
              itemCode: c.itemCode, itemName: c.itemName, changeType: c.changeType,
              field: c.field || null, oldValue: c.oldValue || null, newValue: c.newValue || null,
            })),
          });
          changeCount += changes.length;
        }
      }

      // 逐筆 upsert（避免大 transaction 佔記憶體）
      for (let i = 0; i < drugs.length; i += BATCH_SIZE) {
        const batch = drugs.slice(i, i + BATCH_SIZE);
        for (const drug of batch) {
          const status = drug.endDate && drug.endDate < today ? "停用" : "給付中";
          const data = {
            name: drug.name, generic: drug.generic, form: drug.form,
            strength: drug.strength, price: drug.price, unit: drug.unit,
            atcCode: drug.atcCode, manufacturer: drug.manufacturer,
            category: drug.category, startDate: drug.startDate,
            endDate: drug.endDate, regulationUrl: drug.regulationUrl, status,
          };
          await prisma.drug.upsert({
            where: { code: drug.code },
            update: data,
            create: { code: drug.code, ...data },
          });
        }
      }

      totalRecords += drugs.length;
      offset += limit;
      if (drugs.length < limit) break;
    }

    const finishedAt = new Date();
    await prisma.syncLog.create({
      data: { source: "drugs", status: "success", records: totalRecords, changes: changeCount, startedAt, finishedAt },
    });
    return { source: "drugs", status: "success", records: totalRecords, changes: changeCount, duration: finishedAt.getTime() - startedAt.getTime() };
  } catch (error) {
    const finishedAt = new Date();
    const errorMsg = error instanceof Error ? error.message : "未知錯誤";
    await prisma.syncLog.create({
      data: { source: "drugs", status: "failed", records: 0, changes: 0, startedAt, finishedAt, errorMsg },
    });
    return { source: "drugs", status: "failed", records: 0, changes: 0, duration: finishedAt.getTime() - startedAt.getTime(), errorMsg };
  }
}

/**
 * 同步診療支付標準
 */
export async function syncPayments(): Promise<SyncResult> {
  const startedAt = new Date();

  try {
    const payments = await fetchPayments();

    const existingCount = await prisma.payment.count();
    let changeCount = 0;

    if (existingCount > 0) {
      const changes = await detectPaymentChanges(
        payments.map((p) => ({ code: p.code, name: p.name, price: p.price }))
      );
      changeCount = await saveChanges("payments", changes);
    }

    for (let i = 0; i < payments.length; i += BATCH_SIZE) {
      const batch = payments.slice(i, i + BATCH_SIZE);
      for (const payment of batch) {
        const data = {
          name: payment.name, category: payment.category,
          price: payment.price, unit: payment.unit, startDate: payment.startDate,
        };
        await prisma.payment.upsert({
          where: { code: payment.code },
          update: data,
          create: { code: payment.code, ...data },
        });
      }
    }

    const finishedAt = new Date();
    await prisma.syncLog.create({
      data: { source: "payments", status: "success", records: payments.length, changes: changeCount, startedAt, finishedAt },
    });
    return { source: "payments", status: "success", records: payments.length, changes: changeCount, duration: finishedAt.getTime() - startedAt.getTime() };
  } catch (error) {
    const finishedAt = new Date();
    const errorMsg = error instanceof Error ? error.message : "未知錯誤";
    await prisma.syncLog.create({
      data: { source: "payments", status: "failed", records: 0, changes: 0, startedAt, finishedAt, errorMsg },
    });
    return { source: "payments", status: "failed", records: 0, changes: 0, duration: finishedAt.getTime() - startedAt.getTime(), errorMsg };
  }
}

/**
 * 同步特材品項
 */
export async function syncDevices(): Promise<SyncResult> {
  const startedAt = new Date();

  try {
    const devices = await fetchAllDevices();

    const existingCount = await prisma.device.count();
    let changeCount = 0;

    if (existingCount > 0) {
      const changes = await detectDeviceChanges(
        devices.map((d) => ({ code: d.code, name: d.name, price: d.price }))
      );
      changeCount = await saveChanges("devices", changes);
    }

    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
      const batch = devices.slice(i, i + BATCH_SIZE);
      for (const device of batch) {
        const data = {
          name: device.name, category: device.category,
          price: device.price, selfPay: device.selfPay,
          unit: device.unit, startDate: device.startDate, status: "給付中" as const,
        };
        await prisma.device.upsert({
          where: { code: device.code },
          update: data,
          create: { code: device.code, ...data },
        });
      }
    }

    const finishedAt = new Date();
    await prisma.syncLog.create({
      data: { source: "devices", status: "success", records: devices.length, changes: changeCount, startedAt, finishedAt },
    });
    return { source: "devices", status: "success", records: devices.length, changes: changeCount, duration: finishedAt.getTime() - startedAt.getTime() };
  } catch (error) {
    const finishedAt = new Date();
    const errorMsg = error instanceof Error ? error.message : "未知錯誤";
    await prisma.syncLog.create({
      data: { source: "devices", status: "failed", records: 0, changes: 0, startedAt, finishedAt, errorMsg },
    });
    return { source: "devices", status: "failed", records: 0, changes: 0, duration: finishedAt.getTime() - startedAt.getTime(), errorMsg };
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
