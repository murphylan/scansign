import { NextResponse } from 'next/server';
import { getCheckinById, getCheckinRecords } from '@/lib/stores/checkin-store';

// GET /api/checkins/[id]/records - 获取签到记录
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
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const records = getCheckinRecords(id, { limit, offset });
    
    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Failed to get records:', error);
    return NextResponse.json(
      { success: false, error: '获取签到记录失败' },
      { status: 500 }
    );
  }
}

