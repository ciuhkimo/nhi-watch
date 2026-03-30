import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync-engine";
import { notifyChanges } from "@/lib/notify";

export async function POST() {
  try {
    const results = await syncAll();

    // 同步完成後推播異動通知
    await notifyChanges(results);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失敗";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
