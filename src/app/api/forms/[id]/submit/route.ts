import { NextResponse } from 'next/server';
import { getFormById, submitForm, findResponseByPhone } from '@/lib/stores/form-store';
import { SubmitFormRequest } from '@/types/form';

// POST /api/forms/[id]/submit - 提交表单
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: SubmitFormRequest = await request.json();
    
    const form = getFormById(id);
    if (!form) {
      return NextResponse.json(
        { success: false, error: '表单不存在' },
        { status: 404 }
      );
    }
    
    // 验证手机号格式
    if (form.config.rules.requirePhone) {
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
    
    const result = submitForm(id, body.data, body.phone);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        response: result.response,
        message: form.config.submit.successMessage,
        redirectUrl: form.config.submit.redirectUrl,
        redirectDelay: form.config.submit.redirectDelay,
      },
    });
  } catch (error) {
    console.error('Failed to submit form:', error);
    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    );
  }
}

// GET /api/forms/[id]/submit?phone=xxx - 检查是否已提交
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
    const form = getFormById(id);
    if (!form) {
      return NextResponse.json(
        { success: false, error: '表单不存在' },
        { status: 404 }
      );
    }
    
    const response = findResponseByPhone(id, phone);
    
    return NextResponse.json({
      success: true,
      data: {
        hasSubmitted: !!response,
        limitOne: form.config.rules.limitOne,
      },
    });
  } catch (error) {
    console.error('Failed to check submission:', error);
    return NextResponse.json(
      { success: false, error: '检查失败' },
      { status: 500 }
    );
  }
}

