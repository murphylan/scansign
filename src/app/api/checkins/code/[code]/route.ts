import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getCheckinByCode } from '@/lib/stores/checkin-store';

// GET /api/checkins/code/[code] - 根据短码获取签到
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  try {
    const checkin = getCheckinByCode(code);
    
    if (!checkin) {
      return NextResponse.json(
        { success: false, error: '签到不存在' },
        { status: 404 }
      );
    }
    
    // 生成二维码
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const checkinUrl = `${baseUrl}/c/${checkin.code}`;
    
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
        ...checkin,
        qrCodeUrl,
        checkinUrl,
      },
    });
  } catch (error) {
    console.error('Failed to get checkin by code:', error);
    return NextResponse.json(
      { success: false, error: '获取签到失败' },
      { status: 500 }
    );
  }
}

