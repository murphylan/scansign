import { NextResponse } from 'next/server';
import { 
  getCheckinById, 
  updateCheckin, 
  deleteCheckin 
} from '@/lib/stores/checkin-store';
import { UpdateCheckinRequest } from '@/types/checkin';

// GET /api/checkins/[id] - 获取签到详情
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
    
    return NextResponse.json({
      success: true,
      data: checkin,
    });
  } catch (error) {
    console.error('Failed to get checkin:', error);
    return NextResponse.json(
      { success: false, error: '获取签到失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/checkins/[id] - 更新签到
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: UpdateCheckinRequest = await request.json();
    const checkin = updateCheckin(id, body);
    
    if (!checkin) {
      return NextResponse.json(
        { success: false, error: '签到不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: checkin,
    });
  } catch (error) {
    console.error('Failed to update checkin:', error);
    return NextResponse.json(
      { success: false, error: '更新签到失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/checkins/[id] - 删除签到
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const success = deleteCheckin(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '签到不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete checkin:', error);
    return NextResponse.json(
      { success: false, error: '删除签到失败' },
      { status: 500 }
    );
  }
}

