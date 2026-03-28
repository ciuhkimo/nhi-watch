import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [drugCount, deviceCount, paymentCount, todayChanges, lastSync] =
      await Promise.all([
        prisma.drug.count({ where: { status: "給付中" } }),
        prisma.device.count(),
        prisma.payment.count(),
        prisma.changeLog.count({ where: { date: today } }),
        prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        drugCount,
        deviceCount,
        paymentCount,
        todayChanges,
        lastSync: lastSync
          ? {
              status: lastSync.status,
              startedAt: lastSync.startedAt,
              finishedAt: lastSync.finishedAt,
              records: lastSync.records,
              changes: lastSync.changes,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "查詢統計失敗" },
      { status: 500 }
    );
  }
}
