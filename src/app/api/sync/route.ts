import { NextRequest, NextResponse } from "next/server";
import { syncDrugs, syncDevices, syncPayments } from "@/lib/sync-engine";

// 同步狀態（記憶體中，重啟後重置）
let syncStatus: {
  running: boolean;
  currentSource?: string;
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
      { success: false, error: `同步進行中（${syncStatus.currentSource}），請稍後再試` },
      { status: 409 }
    );
  }

  // 支援 ?source=drugs|devices|payments，預設全部依序執行
  const url = new URL(request.url);
  const source = url.searchParams.get("source");

  syncStatus.running = true;

  const run = async () => {
    const results = [];
    const sources = source ? [source] : ["drugs", "devices", "payments"];

    for (const s of sources) {
      syncStatus.currentSource = s;
      if (s === "drugs") results.push(await syncDrugs());
      else if (s === "devices") results.push(await syncDevices());
      else if (s === "payments") results.push(await syncPayments());
    }

    return results;
  };

  run()
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

  return NextResponse.json({ success: true, message: `同步已在背景啟動（${source || "全部"}）` });
}

// 查詢同步狀態
export async function GET() {
  return NextResponse.json({ success: true, data: syncStatus });
}
