import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { forms } from "@/server/db/schema";
import { getBaseUrlFromRequest } from "@/lib/utils/get-base-url";

// GET /api/forms/code/[code] - 根据短码获取表单
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.code, code))
      .limit(1);

    if (!form) {
      return NextResponse.json(
        { success: false, error: "表单不存在" },
        { status: 404 }
      );
    }

    const baseUrl = getBaseUrlFromRequest(request);
    const formUrl = `${baseUrl}/f/${form.code}`;

    const qrCodeUrl = await QRCode.toDataURL(formUrl, {
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
        id: form.id,
        code: form.code,
        title: form.title,
        description: form.description,
        status: form.status.toLowerCase(),
        fields: form.fields,
        config: form.config,
        display: form.display,
        responseCount: form.responseCount,
        qrCodeUrl,
        formUrl,
      },
    });
  } catch (error) {
    console.error("Failed to get form by code:", error);
    return NextResponse.json(
      { success: false, error: "获取表单失败" },
      { status: 500 }
    );
  }
}
