import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getLotteryById } from '@/lib/stores/lottery-store';
import { getBaseUrlFromRequest } from '@/lib/utils/get-base-url';

// GET /api/lotteries/[id]/qrcode - 获取抽奖二维码
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const lottery = getLotteryById(id);
    
    if (!lottery) {
      return NextResponse.json(
        { success: false, error: '抽奖不存在' },
        { status: 404 }
      );
    }
    
    const baseUrl = getBaseUrlFromRequest(request);
    const lotteryUrl = `${baseUrl}/l/${lottery.code}`;
    
    const qrCodeUrl = await QRCode.toDataURL(lotteryUrl, {
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
        lotteryUrl,
        code: lottery.code,
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

