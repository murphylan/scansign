import { NextResponse } from 'next/server';
import { createLottery, getAllLotteries } from '@/lib/stores/lottery-store';
import { CreateLotteryRequest } from '@/types/lottery';

// GET /api/lotteries - 获取抽奖列表
export async function GET() {
  try {
    const lotteries = getAllLotteries();
    return NextResponse.json({
      success: true,
      data: lotteries,
    });
  } catch (error) {
    console.error('Failed to get lotteries:', error);
    return NextResponse.json(
      { success: false, error: '获取抽奖列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/lotteries - 创建抽奖
export async function POST(request: Request) {
  try {
    const body: CreateLotteryRequest = await request.json();
    
    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入抽奖标题' },
        { status: 400 }
      );
    }
    
    if (!body.config?.prizes || body.config.prizes.length === 0) {
      return NextResponse.json(
        { success: false, error: '请至少添加1个奖品' },
        { status: 400 }
      );
    }
    
    const lottery = createLottery(body);
    
    return NextResponse.json({
      success: true,
      data: lottery,
    });
  } catch (error) {
    console.error('Failed to create lottery:', error);
    return NextResponse.json(
      { success: false, error: '创建抽奖失败' },
      { status: 500 }
    );
  }
}

