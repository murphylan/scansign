import { NextResponse } from 'next/server';
import { 
  getLotteryById, 
  getWinRecords, 
  getWinRecordCount,
} from '@/lib/stores/lottery-store';

// GET /api/lotteries/[id]/records - 获取中奖记录
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  
  try {
    const lottery = getLotteryById(id);
    
    if (!lottery) {
      return NextResponse.json(
        { success: false, error: '抽奖不存在' },
        { status: 404 }
      );
    }
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const records = getWinRecords(id, { limit, offset });
    const total = getWinRecordCount(id);
    
    return NextResponse.json({
      success: true,
      data: {
        records,
        total,
      },
    });
  } catch (error) {
    console.error('Failed to get records:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

