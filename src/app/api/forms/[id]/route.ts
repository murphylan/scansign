import { NextResponse } from 'next/server';
import { 
  getFormById, 
  updateForm, 
  deleteForm,
} from '@/lib/stores/form-store';
import { UpdateFormRequest } from '@/types/form';

// GET /api/forms/[id] - 获取表单详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const form = getFormById(id);
    
    if (!form) {
      return NextResponse.json(
        { success: false, error: '表单不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: form,
    });
  } catch (error) {
    console.error('Failed to get form:', error);
    return NextResponse.json(
      { success: false, error: '获取表单失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/forms/[id] - 更新表单
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body: UpdateFormRequest = await request.json();
    const form = updateForm(id, body);
    
    if (!form) {
      return NextResponse.json(
        { success: false, error: '表单不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: form,
    });
  } catch (error) {
    console.error('Failed to update form:', error);
    return NextResponse.json(
      { success: false, error: '更新表单失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/forms/[id] - 删除表单
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const success = deleteForm(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '表单不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete form:', error);
    return NextResponse.json(
      { success: false, error: '删除表单失败' },
      { status: 500 }
    );
  }
}

