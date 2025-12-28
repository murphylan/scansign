import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getLotteryByCode } from '@/lib/stores/lottery-store';

// GET /api/lotteries/code/[code] - 根据短码获取抽奖
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  try {
    const lottery = getLotteryByCode(code);
    
    if (!lottery) {
      return NextResponse.json(
        { success: false, error: '抽奖不存在' },
        { status: 404 }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
        ...lottery,
        qrCodeUrl,
        lotteryUrl,
      },
    });
  } catch (error) {
    console.error('Failed to get lottery by code:', error);
    return NextResponse.json(
      { success: false, error: '获取抽奖失败' },
      { status: 500 }
    );
  }
}

