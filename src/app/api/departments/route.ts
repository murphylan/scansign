import { NextResponse } from "next/server";
import { DEPARTMENTS } from "@/lib/user-store";
import type { ApiResponse, Department } from "@/types";

// 获取部门列表
export async function GET(): Promise<NextResponse<ApiResponse<Department[]>>> {
  return NextResponse.json({
    success: true,
    data: DEPARTMENTS,
  });
}

