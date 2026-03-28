import { prisma } from "./db";
import type { ChangeType, TableName } from "@/types";

interface DiffResult {
  changeType: ChangeType;
  itemCode: string;
  itemName: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * 比對藥品資料異動
 * 偵測新增、調價、停用
 */
export async function detectDrugChanges(
  incoming: { code: string; name: string; price: number; endDate: string | null }[]
): Promise<DiffResult[]> {
  const changes: DiffResult[] = [];
  const incomingCodes = new Set(incoming.map((d) => d.code));

  // 取得現有資料
  const existing = await prisma.drug.findMany({
    select: { code: true, name: true, price: true, status: true },
  });
  const existingMap = new Map(existing.map((d) => [d.code, d]));

  for (const item of incoming) {
    const old = existingMap.get(item.code);

    if (!old) {
      // 新增
      changes.push({
        changeType: "新增",
        itemCode: item.code,
        itemName: item.name,
      });
    } else if (old.price !== item.price) {
      // 調價
      changes.push({
        changeType: "調價",
        itemCode: item.code,
        itemName: item.name,
        field: "price",
        oldValue: old.price.toString(),
        newValue: item.price.toString(),
      });
    }
  }

  // 停用偵測：現有給付中的品項不在新資料中
  for (const old of existing) {
    if (old.status === "給付中" && !incomingCodes.has(old.code)) {
      changes.push({
        changeType: "停用",
        itemCode: old.code,
        itemName: old.name,
      });
    }
  }

  return changes;
}

/**
 * 比對支付標準資料異動
 */
export async function detectPaymentChanges(
  incoming: { code: string; name: string; price: number }[]
): Promise<DiffResult[]> {
  const changes: DiffResult[] = [];

  const existing = await prisma.payment.findMany({
    select: { code: true, name: true, price: true },
  });
  const existingMap = new Map(existing.map((p) => [p.code, p]));

  for (const item of incoming) {
    const old = existingMap.get(item.code);

    if (!old) {
      changes.push({
        changeType: "新增",
        itemCode: item.code,
        itemName: item.name,
      });
    } else if (old.price !== item.price) {
      changes.push({
        changeType: "調價",
        itemCode: item.code,
        itemName: item.name,
        field: "price",
        oldValue: old.price.toString(),
        newValue: item.price.toString(),
      });
    }
  }

  return changes;
}

/**
 * 將異動寫入 ChangeLog
 */
export async function saveChanges(
  tableName: TableName,
  changes: DiffResult[]
): Promise<number> {
  if (changes.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];

  await prisma.changeLog.createMany({
    data: changes.map((c) => ({
      date: today,
      tableName,
      itemCode: c.itemCode,
      itemName: c.itemName,
      changeType: c.changeType,
      field: c.field || null,
      oldValue: c.oldValue || null,
      newValue: c.newValue || null,
    })),
  });

  return changes.length;
}
