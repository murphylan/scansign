import { NextResponse } from 'next/server';
import { createVote, getAllVotes } from '@/lib/stores/vote-store';
import { CreateVoteRequest } from '@/types/vote';

// GET /api/votes - 获取投票列表
export async function GET() {
  try {
    const votes = getAllVotes();
    return NextResponse.json({
      success: true,
      data: votes,
    });
  } catch (error) {
    console.error('Failed to get votes:', error);
    return NextResponse.json(
      { success: false, error: '获取投票列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/votes - 创建投票
export async function POST(request: Request) {
  try {
    const body: CreateVoteRequest = await request.json();
    
    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入投票标题' },
        { status: 400 }
      );
    }
    
    if (!body.config?.options || body.config.options.length < 2) {
      return NextResponse.json(
        { success: false, error: '请至少添加2个选项' },
        { status: 400 }
      );
    }
    
    const vote = createVote(body);
    
    return NextResponse.json({
      success: true,
      data: vote,
    });
  } catch (error) {
    console.error('Failed to create vote:', error);
    return NextResponse.json(
      { success: false, error: '创建投票失败' },
      { status: 500 }
    );
  }
}

