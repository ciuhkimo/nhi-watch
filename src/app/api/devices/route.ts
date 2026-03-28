import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const where: Prisma.DeviceWhereInput = {};

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.device.count({ where }),
    ]);

    const response: ApiResponse<typeof devices> = {
      success: true,
      data: devices,
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
      { success: false, error: "查詢特材失敗" },
      { status: 500 }
    );
  }
}
