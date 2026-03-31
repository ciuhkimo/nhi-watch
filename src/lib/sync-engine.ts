import { prisma } from "./db";
import { fetchDrugs, fetchAllDevices, fetchPayments } from "./nhi-api";
import { detectDeviceChanges, detectPaymentChanges, saveChanges } from "./diff-detector";

const BATCH_SIZE = 100;

interface SyncResult {
  source: string;
  status: "success" | "failed";
  records: number;
  changes: number;
  duration: number;
  errorMsg?: string;
}

/**
 * 同步藥品資料（逐頁處理，節省記憶體）
 */
export async function syncDrugs(): Promise<SyncResult> {
  const startedAt = new Date();
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

  try {
    // 取得現有藥品建立 Map（只取必要欄位）
    const existing = await prisma.drug.findMany({
      select: { code: true, name: true, price: true, status: true },
    });
    const existingMap = new Map(existing.map((d) => [d.code, d]));
    const incomingCodes = new Set<string>();

    let totalRecords = 0;
    let changeCount = 0;
    let offset = 0;
    const limit = 1000;

    // 逐頁抓取 + 寫入
    while (true) {
      const { records: drugs } = await fetchDrugs(limit, offset);
      if (drugs.length === 0) break;

      // 偵測這一頁的異動
      const pageChanges: { changeType: string; itemCode: string; itemName: string; field?: string; oldValue?: string; newValue?: string }[] = [];
      for (const drug of drugs) {
        incomingCodes.add(drug.code);
        const old = existingMap.get(drug.code);
        if (!old) {
          pageChanges.push({ changeType: "新增", itemCode: drug.code, itemName: drug.name });
        } else if (old.price !== drug.price) {
          pageChanges.push({
            changeType: "調價", itemCode: drug.code, itemName: drug.name,
            field: "price", oldValue: old.price.toString(), newValue: drug.price.toString(),
          });
        }
      }

      // 寫入異動紀錄
      if (pageChanges.length > 0) {
        const todayStr = today;
        await prisma.changeLog.createMany({
          data: pageChanges.map((c) => ({
            date: todayStr, tableName: "drugs" as const,
            itemCode: c.itemCode, itemName: c.itemName, changeType: c.changeType,
            field: c.field || null, oldValue: c.oldValue || null, newValue: c.newValue || null,
          })),
        });
        changeCount += pageChanges.length;
      }

      // 記錄藥價歷史（新增與調價）
      const priceItems = pageChanges.filter((c) => c.changeType === "調價" || c.changeType === "新增");
      for (const c of priceItems) {
        const drug = drugs.find((d) => d.code === c.itemCode);
        if (drug) {
          await prisma.priceHistory.upsert({
            where: { drugCode_date: { drugCode: drug.code, date: today } },
            update: { price: drug.price },
            create: { drugCode: drug.code, price: drug.price, date: today },
          });
        }
      }

      // 批次 upsert 藥品（更小的 batch）
      for (let i = 0; i < drugs.length; i += BATCH_SIZE) {
        const batch = drugs.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(
          batch.map((drug) => {
            const status = drug.endDate && drug.endDate < today ? "停用" : "給付中";
            const data = {
              name: drug.name, generic: drug.generic, form: drug.form,
              strength: drug.strength, price: drug.price, unit: drug.unit,
              atcCode: drug.atcCode, manufacturer: drug.manufacturer,
              category: drug.category, startDate: drug.startDate,
              endDate: drug.endDate, regulationUrl: drug.regulationUrl, status,
            };
            return prisma.drug.upsert({
              where: { code: drug.code },
              update: data,
              create: { code: drug.code, ...data },
            });
          })
        );
      }

      totalRecords += drugs.length;
      offset += limit;
      if (drugs.length < limit) break;
    }

    // 標記停用
    if (incomingCodes.size > 0) {
      // 停用偵測
      for (const old of existing) {
        if (old.status === "給付中" && !incomingCodes.has(old.code)) {
          await prisma.changeLog.create({
            data: {
              date: today, tableName: "drugs", itemCode: old.code,
              itemName: old.name, changeType: "停用",
            },
          });
          changeCount++;
        }
      }
      await prisma.drug.updateMany({
        where: { code: { notIn: Array.from(incomingCodes) }, status: "給付中" },
        data: { status: "停用" },
      });
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

    const changes = await detectPaymentChanges(
      payments.map((p) => ({ code: p.code, name: p.name, price: p.price }))
    );
    const changeCount = await saveChanges("payments", changes);

    for (let i = 0; i < payments.length; i += BATCH_SIZE) {
      const batch = payments.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((payment) => {
          const data = {
            name: payment.name, category: payment.category,
            price: payment.price, unit: payment.unit, startDate: payment.startDate,
          };
          return prisma.payment.upsert({
            where: { code: payment.code },
            update: data,
            create: { code: payment.code, ...data },
          });
        })
      );
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
 * 同步特材品項（從健保署 INAE2000 API 爬取）
 */
export async function syncDevices(): Promise<SyncResult> {
  const startedAt = new Date();

  try {
    const devices = await fetchAllDevices();

    const changes = await detectDeviceChanges(
      devices.map((d) => ({ code: d.code, name: d.name, price: d.price }))
    );
    const changeCount = await saveChanges("devices", changes);

    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
      const batch = devices.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((device) => {
          const data = {
            name: device.name, category: device.category,
            price: device.price, selfPay: device.selfPay,
            unit: device.unit, startDate: device.startDate, status: "給付中" as const,
          };
          return prisma.device.upsert({
            where: { code: device.code },
            update: data,
            create: { code: device.code, ...data },
          });
        })
      );
    }

    const incomingCodes = devices.map((d) => d.code);
    if (incomingCodes.length > 0) {
      await prisma.device.updateMany({
        where: { code: { notIn: incomingCodes }, status: "給付中" },
        data: { status: "停用" },
      });
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
