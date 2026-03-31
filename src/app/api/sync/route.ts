import { NextRequest, NextResponse } from "next/server";
import { syncAll } from "@/lib/sync-engine";
import { notifyChanges } from "@/lib/notify";

export async function POST(request: NextRequest) {
  // 驗證 API key（未設定 SYNC_SECRET 時跳過驗證，方便 demo）
  const authHeader = request.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET;

  if (syncSecret && authHeader !== `Bearer ${syncSecret}`) {
    return NextResponse.json(
      { success: false, error: "未授權" },
      { status: 401 }
    );
  }

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
