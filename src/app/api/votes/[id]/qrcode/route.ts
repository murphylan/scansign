import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getVoteById } from '@/lib/stores/vote-store';

// GET /api/votes/[id]/qrcode - 获取投票二维码
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const vote = getVoteById(id);
    
    if (!vote) {
      return NextResponse.json(
        { success: false, error: '投票不存在' },
        { status: 404 }
      );
    }
    
    // 生成手机端投票链接
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const voteUrl = `${baseUrl}/v/${vote.code}`;
    
    // 生成二维码
    const qrCodeUrl = await QRCode.toDataURL(voteUrl, {
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
        voteUrl,
        code: vote.code,
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

