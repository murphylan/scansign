import { NextRequest, NextResponse } from "next/server";
import { checkDuplicateUsername } from "@/lib/user-store";
import type { ApiResponse } from "@/types";

// 检查用户名+部门是否重复
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ duplicate: boolean }>>> {
  try {
    const body = await request.json();
    const { username, departmentId, excludeUserId } = body;

    if (!username || !departmentId) {
      return NextResponse.json(
        { success: false, error: "用户名和部门不能为空" },
        { status: 400 }
      );
    }

    const duplicate = checkDuplicateUsername(username, departmentId, excludeUserId);

    return NextResponse.json({
      success: true,
      data: { duplicate },
    });
  } catch (error) {
    console.error("Check username error:", error);
    return NextResponse.json(
      { success: false, error: "检查用户名失败" },
      { status: 500 }
    );
  }
}

