import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    const drug = await prisma.drug.findUnique({
      where: { code },
      select: { name: true, price: true },
    });

    if (!drug) {
      return NextResponse.json(
        { success: false, error: "找不到該藥品" },
        { status: 404 }
      );
    }

    const history = await prisma.priceHistory.findMany({
      where: { drugCode: code },
      orderBy: { date: "asc" },
      select: { date: true, price: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        drugCode: code,
        drugName: drug.name,
        currentPrice: drug.price,
        history: history.map((h) => ({
          date: h.date,
          price: h.price,
        })),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "查詢藥價歷史失敗" },
      { status: 500 }
    );
  }
}
