import { NextResponse } from 'next/server';
import { 
  getLotteryById, 
  updateLottery, 
  deleteLottery,
  resetLottery,
} from '@/lib/stores/lottery-store';
import { UpdateLotteryRequest } from '@/types/lottery';

// GET /api/lotteries/[id] - 获取抽奖详情
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
    
    return NextResponse.json({
      success: true,
      data: lottery,
    });
  } catch (error) {
    console.error('Failed to get lottery:', error);
    return NextResponse.json(
      { success: false, error: '获取抽奖失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/lotteries/[id] - 更新抽奖
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: UpdateLotteryRequest = await request.json();
    const lottery = updateLottery(id, body);
    
    if (!lottery) {
      return NextResponse.json(
        { success: false, error: '抽奖不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: lottery,
    });
  } catch (error) {
    console.error('Failed to update lottery:', error);
    return NextResponse.json(
      { success: false, error: '更新抽奖失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/lotteries/[id] - 删除抽奖
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const success = deleteLottery(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '抽奖不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete lottery:', error);
    return NextResponse.json(
      { success: false, error: '删除抽奖失败' },
      { status: 500 }
    );
  }
}

// POST /api/lotteries/[id]?action=reset - 重置抽奖
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'reset') {
    try {
      const success = resetLottery(id);
      
      if (!success) {
        return NextResponse.json(
          { success: false, error: '抽奖不存在' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: '抽奖已重置',
      });
    } catch (error) {
      console.error('Failed to reset lottery:', error);
      return NextResponse.json(
        { success: false, error: '重置抽奖失败' },
        { status: 500 }
      );
    }
  }
  
  return NextResponse.json(
    { success: false, error: '未知操作' },
    { status: 400 }
  );
}

