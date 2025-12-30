import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { prisma } from "@/lib/db";
import { getBaseUrlFromRequest } from "@/lib/utils/get-base-url";

// GET /api/votes/code/[code] - 根据短码获取投票
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const vote = await prisma.vote.findUnique({
      where: { code },
      include: {
        options: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!vote) {
      return NextResponse.json(
        { success: false, error: "投票不存在" },
        { status: 404 }
      );
    }

    // 生成二维码
    const baseUrl = getBaseUrlFromRequest(request);
    const voteUrl = `${baseUrl}/v/${vote.code}`;

    const qrCodeUrl = await QRCode.toDataURL(voteUrl, {
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
        id: vote.id,
        code: vote.code,
        title: vote.title,
        description: vote.description,
        status: vote.status.toLowerCase(),
        voteType: vote.voteType.toLowerCase(),
        maxChoices: vote.maxChoices,
        options: vote.options.map((o) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          imageUrl: o.imageUrl,
          voteCount: o.voteCount,
        })),
        config: vote.config,
        display: vote.display,
        qrCodeUrl,
        voteUrl,
      },
    });
  } catch (error) {
    console.error("Failed to get vote by code:", error);
    return NextResponse.json(
      { success: false, error: "获取投票失败" },
      { status: 500 }
    );
  }
}
