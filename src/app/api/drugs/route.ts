import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const where: Prisma.DrugWhereInput = {};

    // 搜尋：健保碼、品名、學名模糊搜尋
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { generic: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [drugs, total] = await Promise.all([
      prisma.drug.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: search
          ? [{ code: "asc" }]
          : [{ updatedAt: "desc" }],
      }),
      prisma.drug.count({ where }),
    ]);

    const response: ApiResponse<typeof drugs> = {
      success: true,
      data: drugs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { success: false, error: "查詢藥品失敗" },
      { status: 500 }
    );
  }
}
