import { NextRequest, NextResponse } from "next/server";
import { getUserByPhone } from "@/lib/user-store";
import type { ApiResponse, UserCheckResponse } from "@/types";

// 检查手机号是否已注册
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UserCheckResponse>>> {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "手机号不能为空" },
        { status: 400 }
      );
    }

    const user = getUserByPhone(phone);

    return NextResponse.json({
      success: true,
      data: {
        exists: !!user,
        user: user || undefined,
      },
    });
  } catch (error) {
    console.error("Check user error:", error);
    return NextResponse.json(
      { success: false, error: "查询用户失败" },
      { status: 500 }
    );
  }
}

