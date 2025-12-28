import { NextResponse } from 'next/server';
import { getCheckinById, doCheckin, findRecordByPhone } from '@/lib/stores/checkin-store';
import { DoCheckinRequest } from '@/types/checkin';

// POST /api/checkins/[id]/confirm - 执行签到
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: DoCheckinRequest = await request.json();
    
    if (!body.phone) {
      return NextResponse.json(
        { success: false, error: '请输入手机号' },
        { status: 400 }
      );
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(body.phone)) {
      return NextResponse.json(
        { success: false, error: '请输入正确的手机号' },
        { status: 400 }
      );
    }
    
    const checkin = getCheckinById(id);
    if (!checkin) {
      return NextResponse.json(
        { success: false, error: '签到不存在' },
        { status: 404 }
      );
    }
    
    // 检查姓名是否必填
    if (checkin.config.fields.name && !body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入姓名' },
        { status: 400 }
      );
    }
    
    // 检查部门是否必填
    if (checkin.config.fields.department && !body.departmentId) {
      return NextResponse.json(
        { success: false, error: '请选择部门' },
        { status: 400 }
      );
    }
    
    const result = doCheckin(
      id,
      body.phone,
      body.name,
      body.departmentId,
      body.customData,
      body.verifyCode
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
        message: result.isUpdate ? '信息更新成功' : '签到成功',
        verifyCode: result.isUpdate ? undefined : result.record?.verifyCode,
        afterCheckin: checkin.config.afterCheckin,
      },
    });
  } catch (error) {
    console.error('Failed to confirm checkin:', error);
    return NextResponse.json(
      { success: false, error: '签到失败' },
      { status: 500 }
    );
  }
}

// GET /api/checkins/[id]/confirm?phone=xxx - 检查手机号是否已签到
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
    const checkin = getCheckinById(id);
    if (!checkin) {
      return NextResponse.json(
        { success: false, error: '签到不存在' },
        { status: 404 }
      );
    }
    
    const record = findRecordByPhone(id, phone);
    
    return NextResponse.json({
      success: true,
      data: {
        exists: !!record,
        record: record ? {
          name: record.participant.name,
          departmentId: record.departmentId,
          departmentName: record.departmentName,
        } : null,
      },
    });
  } catch (error) {
    console.error('Failed to check phone:', error);
    return NextResponse.json(
      { success: false, error: '检查失败' },
      { status: 500 }
    );
  }
}

