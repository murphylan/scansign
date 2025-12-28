import { NextResponse } from 'next/server';
import { getVoteById, submitVote, findVoteRecord } from '@/lib/stores/vote-store';
import { SubmitVoteRequest } from '@/types/vote';

// POST /api/votes/[id]/submit - 提交投票
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: SubmitVoteRequest = await request.json();
    
    const vote = getVoteById(id);
    if (!vote) {
      return NextResponse.json(
        { success: false, error: '投票不存在' },
        { status: 404 }
      );
    }
    
    // 验证手机号格式
    if (vote.config.requirePhone) {
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
    
    const result = submitVote(
      id,
      body.selectedOptions,
      body.phone,
      body.name
    );
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        record: result.record,
        isUpdate: result.isUpdate,
        message: result.isUpdate ? '投票已更新' : '投票成功',
        // 返回当前选项数据（如果允许查看）
        options: vote.config.showResult.afterVote ? vote.config.options : undefined,
        stats: vote.config.showResult.afterVote ? vote.stats : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to submit vote:', error);
    return NextResponse.json(
      { success: false, error: '投票失败' },
      { status: 500 }
    );
  }
}

// GET /api/votes/[id]/submit?phone=xxx - 检查是否已投票
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
    const vote = getVoteById(id);
    if (!vote) {
      return NextResponse.json(
        { success: false, error: '投票不存在' },
        { status: 404 }
      );
    }
    
    const record = findVoteRecord(id, phone);
    
    return NextResponse.json({
      success: true,
      data: {
        hasVoted: !!record,
        selectedOptions: record?.selectedOptions,
        allowChange: vote.config.allowChange,
      },
    });
  } catch (error) {
    console.error('Failed to check vote:', error);
    return NextResponse.json(
      { success: false, error: '检查失败' },
      { status: 500 }
    );
  }
}

