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
      select: { name: true, regulationUrl: true },
    });

    if (!drug) {
      return NextResponse.json(
        { success: false, error: "找不到該藥品" },
        { status: 404 }
      );
    }

    const regulations = await prisma.drugRegulation.findMany({
      where: { drugCode: code },
      orderBy: { payCode: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        drugCode: code,
        drugName: drug.name,
        regulationUrl: drug.regulationUrl,
        regulations: regulations.map((r) => ({
          payCode: r.payCode,
          title: r.title,
          content: r.content,
          sourceUrl: r.sourceUrl,
        })),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "查詢給付規定失敗" },
      { status: 500 }
    );
  }
}
