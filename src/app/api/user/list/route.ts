import { NextResponse } from "next/server";
import { getRecentUsers, getAllUsers } from "@/lib/user-store";
import type { ApiResponse, UserListResponse } from "@/types";

// 获取用户列表
export async function GET(): Promise<NextResponse<ApiResponse<UserListResponse>>> {
  try {
    const users = getRecentUsers(100);
    const total = getAllUsers().length;

    return NextResponse.json({
      success: true,
      data: {
        users,
        total,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { success: false, error: "获取用户列表失败" },
      { status: 500 }
    );
  }
}

