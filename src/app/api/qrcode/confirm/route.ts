import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSessionStatus } from "@/lib/session-store";
import {
  getUserByPhone,
  checkDuplicateUsername,
  registerUser,
  updateUser,
  verifyUserCode,
  DEPARTMENTS,
} from "@/lib/user-store";
import { userInfoSchema } from "@/types";
import type { ApiResponse } from "@/types";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { token, username, phone, departmentId, existingUserId, verifyCode } = body;

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

    // 检查会话（老用户更新信息时，session 可能已过期，这是允许的）
    const session = getSession(token);
    const isExistingUser = !!existingUserId;

    // 新用户注册必须有有效的 session
    if (!isExistingUser) {
      if (!session) {
        return NextResponse.json(
          { success: false, error: "会话不存在或已过期，请重新扫码" },
          { status: 404 }
        );
      }

      if (session.status === "expired") {
        return NextResponse.json(
          { success: false, error: "二维码已过期，请刷新重试" },
          { status: 410 }
        );
      }
    }

    // 老用户修改信息需要验证验证码
    if (isExistingUser) {
      if (!verifyCode) {
        return NextResponse.json(
          { success: false, error: "请输入验证码" },
          { status: 400 }
        );
      }

      if (!verifyUserCode(existingUserId, verifyCode)) {
        return NextResponse.json(
          { success: false, error: "验证码错误，如忘记请联系管理员" },
          { status: 403 }
        );
      }
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
    let userVerifyCode: string | undefined;

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
      userVerifyCode = newUser.verifyCode; // 返回验证码给新用户
    }

    // 更新会话状态（如果 session 存在的话）
    if (session) {
      updateSessionStatus(token, "confirmed", {
        username: validation.data.username,
        phone: validation.data.phone,
        departmentId: validation.data.departmentId,
        departmentName: department?.name || "未知部门",
        submittedAt: Date.now(),
        isNewUser,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: isNewUser ? "签到成功" : "信息更新成功",
        userId: registeredUserId,
        verifyCode: userVerifyCode, // 只有新用户才返回验证码
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
