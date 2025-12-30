import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { checkins } from "@/server/db/schema";
import { getBaseUrlFromRequest } from "@/lib/utils/get-base-url";

// GET /api/checkins/code/[code] - 根据短码获取签到（公开访问 - 手机端/大屏）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.code, code))
      .limit(1);

    if (!checkin) {
      return NextResponse.json(
        { success: false, error: "签到不存在" },
        { status: 404 }
      );
    }

    // 生成二维码
    const baseUrl = getBaseUrlFromRequest(request);
    const checkinUrl = `${baseUrl}/c/${checkin.code}`;

    const qrCodeUrl = await QRCode.toDataURL(checkinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: checkin.id,
        code: checkin.code,
        title: checkin.title,
        description: checkin.description,
        status: checkin.status.toLowerCase(),
        config: checkin.config,
        display: checkin.display,
        stats: {
          total: checkin.totalCount,
          today: checkin.todayCount,
          byDepartment: {},
        },
        qrCodeUrl,
        checkinUrl,
      },
    });
  } catch (error) {
    console.error("Failed to get checkin by code:", error);
    return NextResponse.json(
      { success: false, error: "获取签到失败" },
      { status: 500 }
    );
  }
}
