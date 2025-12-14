import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSessionStatus } from "@/lib/session-store";
import {
  getUserByPhone,
  checkDuplicateUsername,
  registerUser,
  updateUser,
  DEPARTMENTS,
} from "@/lib/user-store";
import { userInfoSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { token, username, phone, departmentId, existingUserId } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token 不能为空" },
        { status: 400 }
      );
    }

    // 验证用户输入
    const validation = userInfoSchema.safeParse({ username, phone, departmentId });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    // 检查会话
    const session = getSession(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "会话不存在或已过期" },
        { status: 404 }
      );
    }

    if (session.status === "expired") {
      return NextResponse.json(
        { success: false, error: "二维码已过期，请刷新重试" },
        { status: 410 }
      );
    }

    if (session.status === "confirmed") {
      return NextResponse.json(
        { success: false, error: "该二维码已被使用" },
        { status: 409 }
      );
    }

    // 检查用户名+部门是否重复
    const isDuplicate = checkDuplicateUsername(
      validation.data.username,
      validation.data.departmentId,
      existingUserId
    );
    if (isDuplicate) {
      return NextResponse.json(
        { success: false, error: "该部门已存在同名用户，请修改用户名或选择其他部门" },
        { status: 409 }
      );
    }

    const department = DEPARTMENTS.find((d) => d.id === validation.data.departmentId);
    let registeredUserId: string;
    let isNewUser = true;

    if (existingUserId) {
      // 更新现有用户
      const updatedUser = updateUser(existingUserId, {
        phone: validation.data.phone,
        username: validation.data.username,
        departmentId: validation.data.departmentId,
      });

      if (!updatedUser) {
        return NextResponse.json(
          { success: false, error: "用户不存在" },
          { status: 404 }
        );
      }

      registeredUserId = existingUserId;
      isNewUser = false;
    } else {
      // 再次检查手机号是否已被注册（防止并发）
      const existingUser = getUserByPhone(validation.data.phone);
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "该手机号已被注册，请使用修改信息功能" },
          { status: 409 }
        );
      }

      // 注册新用户
      const newUser = registerUser({
        phone: validation.data.phone,
        username: validation.data.username,
        departmentId: validation.data.departmentId,
      });
      registeredUserId = newUser.id;
    }

    // 更新会话状态
    updateSessionStatus(token, "confirmed", {
      username: validation.data.username,
      phone: validation.data.phone,
      departmentId: validation.data.departmentId,
      departmentName: department?.name || "未知部门",
      submittedAt: Date.now(),
      isNewUser,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: isNewUser ? "注册成功" : "信息更新成功",
        userId: registeredUserId,
      },
    });
  } catch (error) {
    console.error("Confirm login error:", error);
    return NextResponse.json(
      { success: false, error: "确认登录失败" },
      { status: 500 }
    );
  }
}
