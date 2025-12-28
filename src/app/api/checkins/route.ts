import { NextResponse } from 'next/server';
import { createCheckin, getAllCheckins } from '@/lib/stores/checkin-store';
import { CreateCheckinRequest } from '@/types/checkin';

// GET /api/checkins - 获取签到列表
export async function GET() {
  try {
    const checkins = getAllCheckins();
    return NextResponse.json({
      success: true,
      data: checkins,
    });
  } catch (error) {
    console.error('Failed to get checkins:', error);
    return NextResponse.json(
      { success: false, error: '获取签到列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/checkins - 创建签到
export async function POST(request: Request) {
  try {
    const body: CreateCheckinRequest = await request.json();
    
    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入签到标题' },
        { status: 400 }
      );
    }
    
    const checkin = createCheckin(body);
    
    return NextResponse.json({
      success: true,
      data: checkin,
    });
  } catch (error) {
    console.error('Failed to create checkin:', error);
    return NextResponse.json(
      { success: false, error: '创建签到失败' },
      { status: 500 }
    );
  }
}

