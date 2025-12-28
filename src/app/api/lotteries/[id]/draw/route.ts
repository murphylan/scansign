import { NextResponse } from 'next/server';
import { getLotteryById, executeDraw, getUserDrawCount } from '@/lib/stores/lottery-store';
import { DrawRequest } from '@/types/lottery';

// POST /api/lotteries/[id]/draw - 执行抽奖
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: DrawRequest = await request.json();
    
    const lottery = getLotteryById(id);
    if (!lottery) {
      return NextResponse.json(
        { success: false, error: '抽奖不存在' },
        { status: 404 }
      );
    }
    
    // 验证手机号格式
    if (lottery.config.requirePhone) {
      if (!body.phone) {
        return NextResponse.json(
          { success: false, error: '请输入手机号' },
          { status: 400 }
        );
      }
      if (!/^1[3-9]\d{9}$/.test(body.phone)) {
        return NextResponse.json(
          { success: false, error: '请输入正确的手机号' },
          { status: 400 }
        );
      }
    }
    
    const result = executeDraw(id, body.phone, body.name);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to execute draw:', error);
    return NextResponse.json(
      { success: false, error: '抽奖失败' },
      { status: 500 }
    );
  }
}

// GET /api/lotteries/[id]/draw?phone=xxx - 检查抽奖状态
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  
  if (!phone) {
    return NextResponse.json(
      { success: false, error: '请提供手机号' },
      { status: 400 }
    );
  }
  
  try {
    const lottery = getLotteryById(id);
    if (!lottery) {
      return NextResponse.json(
        { success: false, error: '抽奖不存在' },
        { status: 404 }
      );
    }
    
    const drawCount = getUserDrawCount(id, phone);
    const maxDraws = lottery.config.maxDrawsPerUser;
    
    return NextResponse.json({
      success: true,
      data: {
        drawCount,
        maxDraws,
        remainingDraws: Math.max(0, maxDraws - drawCount),
        canDraw: drawCount < maxDraws,
      },
    });
  } catch (error) {
    console.error('Failed to check draw status:', error);
    return NextResponse.json(
      { success: false, error: '检查失败' },
      { status: 500 }
    );
  }
}

