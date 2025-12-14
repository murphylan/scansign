import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import type { ApiResponse, StatusResponse } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<ApiResponse<StatusResponse>>> {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token 不能为空" },
        { status: 400 }
      );
    }

    const session = getSession(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "会话不存在或已过期" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: session.status,
        userInfo: session.userInfo,
      },
    });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json(
      { success: false, error: "查询状态失败" },
      { status: 500 }
    );
  }
}

