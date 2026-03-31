import { NextRequest, NextResponse } from "next/server";
import { syncAll } from "@/lib/sync-engine";

// 同步狀態（記憶體中，重啟後重置）
let syncStatus: {
  running: boolean;
  lastResult?: { success: boolean; data?: unknown; error?: string; finishedAt: string };
} = { running: false };

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

  if (syncStatus.running) {
    return NextResponse.json(
      { success: false, error: "同步進行中，請稍後再試" },
      { status: 409 }
    );
  }

  // 背景執行同步，立即回應
  syncStatus.running = true;
  syncAll()
    .then((results) => {
      syncStatus = {
        running: false,
        lastResult: { success: true, data: results, finishedAt: new Date().toISOString() },
      };
    })
    .catch((error) => {
      syncStatus = {
        running: false,
        lastResult: {
          success: false,
          error: error instanceof Error ? error.message : "同步失敗",
          finishedAt: new Date().toISOString(),
        },
      };
    });

  return NextResponse.json({ success: true, message: "同步已在背景啟動" });
}

// 查詢同步狀態
export async function GET() {
  return NextResponse.json({ success: true, data: syncStatus });
}
