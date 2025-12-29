import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getCheckinById } from '@/lib/stores/checkin-store';
import { getBaseUrlFromRequest } from '@/lib/utils/get-base-url';

// GET /api/checkins/[id]/qrcode - 获取签到二维码
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const checkin = getCheckinById(id);
    
    if (!checkin) {
      return NextResponse.json(
        { success: false, error: '签到不存在' },
        { status: 404 }
      );
    }
    
    // 生成手机端签到链接
    const baseUrl = getBaseUrlFromRequest(request);
    const checkinUrl = `${baseUrl}/c/${checkin.code}`;
    
    // 生成二维码
    const qrCodeUrl = await QRCode.toDataURL(checkinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl,
        checkinUrl,
        code: checkin.code,
      },
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return NextResponse.json(
      { success: false, error: '生成二维码失败' },
      { status: 500 }
    );
  }
}

