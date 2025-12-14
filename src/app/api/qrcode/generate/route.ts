import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { createSession } from "@/lib/session-store";
import type { ApiResponse, QRCodeResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<QRCodeResponse>>> {
  try {
    // 生成唯一token
    const token = uuidv4();
    
    // 创建会话
    const session = createSession(token);
    
    // 从请求头获取 host，支持手机扫码访问
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const h5Url = `${baseUrl}/mobile/confirm?token=${token}`;
    
    // 生成二维码
    const qrCodeUrl = await QRCode.toDataURL(h5Url, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        qrCodeUrl,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Generate QR code error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "生成二维码失败",
      },
      { status: 500 }
    );
  }
}

