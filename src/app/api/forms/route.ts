import { NextResponse } from 'next/server';
import { createForm, getAllForms } from '@/lib/stores/form-store';
import { CreateFormRequest } from '@/types/form';

// GET /api/forms - 获取表单列表
export async function GET() {
  try {
    const forms = getAllForms();
    return NextResponse.json({
      success: true,
      data: forms,
    });
  } catch (error) {
    console.error('Failed to get forms:', error);
    return NextResponse.json(
      { success: false, error: '获取表单列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/forms - 创建表单
export async function POST(request: Request) {
  try {
    const body: CreateFormRequest = await request.json();
    
    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入表单标题' },
        { status: 400 }
      );
    }
    
    if (!body.config?.fields || body.config.fields.length === 0) {
      return NextResponse.json(
        { success: false, error: '请至少添加1个字段' },
        { status: 400 }
      );
    }
    
    const form = createForm(body);
    
    return NextResponse.json({
      success: true,
      data: form,
    });
  } catch (error) {
    console.error('Failed to create form:', error);
    return NextResponse.json(
      { success: false, error: '创建表单失败' },
      { status: 500 }
    );
  }
}

