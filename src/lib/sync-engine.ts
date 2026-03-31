import { prisma } from "./db";
import { fetchDrugs, fetchAllDevices, fetchPayments } from "./nhi-api";
import { detectDeviceChanges, detectPaymentChanges, saveChanges } from "./diff-detector";
import type { DrugData } from "./nhi-api";

interface SyncResult {
  source: string;
  status: "success" | "failed";
  records: number;
  changes: number;
  duration: number;
  errorMsg?: string;
}

/** 用 raw SQL 寫入藥品（繞過 Prisma ORM 記憶體開銷） */
async function upsertDrugRaw(drug: DrugData, today: string) {
  const status = drug.endDate && drug.endDate < today ? "停用" : "給付中";
  const now = new Date().toISOString();
  const esc = (v: string | null) => v ?? null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO Drug (code, name, generic, form, strength, price, unit, atcCode, manufacturer, category, startDate, endDate, regulationUrl, status, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET
       name=excluded.name, generic=excluded.generic, form=excluded.form,
       strength=excluded.strength, price=excluded.price, unit=excluded.unit,
       atcCode=excluded.atcCode, manufacturer=excluded.manufacturer,
       category=excluded.category, startDate=excluded.startDate,
       endDate=excluded.endDate, regulationUrl=excluded.regulationUrl,
       status=excluded.status, updatedAt=excluded.updatedAt`,
    drug.code, drug.name, esc(drug.generic), esc(drug.form), esc(drug.strength),
    drug.price, esc(drug.unit), esc(drug.atcCode), esc(drug.manufacturer),
    esc(drug.category), esc(drug.startDate), esc(drug.endDate),
    esc(drug.regulationUrl), status, now
  );
}

/**
 * 同步藥品資料（Raw SQL 模式：極低記憶體）
 */
export async function syncDrugs(): Promise<SyncResult> {
  const startedAt = new Date();
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

  try {
    let totalRecords = 0;
    let offset = 0;
    const limit = 500;
    const MAX_RECORDS = 3000; // Demo 模式：限制筆數避免 OOM

    while (totalRecords < MAX_RECORDS) {
      const { records: drugs } = await fetchDrugs(limit, offset);
      if (drugs.length === 0) break;

      for (const drug of drugs) {
        if (totalRecords >= MAX_RECORDS) break;
        await upsertDrugRaw(drug, today);
        totalRecords++;
      }

      offset += limit;
      if (drugs.length < limit) break;
    }

    const finishedAt = new Date();
    await prisma.syncLog.create({
      data: { source: "drugs", status: "success", records: totalRecords, changes: 0, startedAt, finishedAt },
    });
    return { source: "drugs", status: "success", records: totalRecords, changes: 0, duration: finishedAt.getTime() - startedAt.getTime() };
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

    for (const payment of payments) {
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

    for (const device of devices) {
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
