import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { lotteries, lotteryPrizes } from "@/server/db/schema";
import { getBaseUrlFromRequest } from "@/lib/utils/get-base-url";

// GET /api/lotteries/code/[code] - 根据短码获取抽奖
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.code, code))
      .limit(1);

    if (!lottery) {
      return NextResponse.json(
        { success: false, error: "抽奖不存在" },
        { status: 404 }
      );
    }

    // 获取奖品
    const prizes = await db
      .select()
      .from(lotteryPrizes)
      .where(eq(lotteryPrizes.lotteryId, lottery.id))
      .orderBy(lotteryPrizes.sortOrder);

    const baseUrl = getBaseUrlFromRequest(request);
    const lotteryUrl = `${baseUrl}/l/${lottery.code}`;

    const qrCodeUrl = await QRCode.toDataURL(lotteryUrl, {
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
        id: lottery.id,
        code: lottery.code,
        title: lottery.title,
        description: lottery.description,
        status: lottery.status.toLowerCase(),
        prizes: prizes.map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          remaining: p.remaining,
          probability: p.probability,
        })),
        config: lottery.config,
        display: lottery.display,
        participantCount: lottery.participantCount,
        qrCodeUrl,
        lotteryUrl,
      },
    });
  } catch (error) {
    console.error("Failed to get lottery by code:", error);
    return NextResponse.json(
      { success: false, error: "获取抽奖失败" },
      { status: 500 }
    );
  }
}
