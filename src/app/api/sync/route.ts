import { NextResponse } from "next/server";
import { syncDrugs } from "@/lib/sync-engine";

export async function POST() {
  try {
    const result = await syncDrugs();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失敗";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
