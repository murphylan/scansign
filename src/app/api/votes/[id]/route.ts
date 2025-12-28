import { NextResponse } from 'next/server';
import { 
  getVoteById, 
  updateVote, 
  deleteVote,
  resetVoteResults,
} from '@/lib/stores/vote-store';
import { UpdateVoteRequest } from '@/types/vote';

// GET /api/votes/[id] - 获取投票详情
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
    
    return NextResponse.json({
      success: true,
      data: vote,
    });
  } catch (error) {
    console.error('Failed to get vote:', error);
    return NextResponse.json(
      { success: false, error: '获取投票失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/votes/[id] - 更新投票
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: UpdateVoteRequest = await request.json();
    const vote = updateVote(id, body);
    
    if (!vote) {
      return NextResponse.json(
        { success: false, error: '投票不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: vote,
    });
  } catch (error) {
    console.error('Failed to update vote:', error);
    return NextResponse.json(
      { success: false, error: '更新投票失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/votes/[id] - 删除投票
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const success = deleteVote(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '投票不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete vote:', error);
    return NextResponse.json(
      { success: false, error: '删除投票失败' },
      { status: 500 }
    );
  }
}

// POST /api/votes/[id] - 重置投票结果
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'reset') {
    try {
      const success = resetVoteResults(id);
      
      if (!success) {
        return NextResponse.json(
          { success: false, error: '投票不存在' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: '投票结果已重置',
      });
    } catch (error) {
      console.error('Failed to reset vote:', error);
      return NextResponse.json(
        { success: false, error: '重置投票失败' },
        { status: 500 }
      );
    }
  }
  
  return NextResponse.json(
    { success: false, error: '未知操作' },
    { status: 400 }
  );
}

