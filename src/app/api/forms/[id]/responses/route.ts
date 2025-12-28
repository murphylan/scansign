import { NextResponse } from 'next/server';
import { 
  getFormById, 
  getFormResponses, 
  getFormResponseCount,
  exportFormDataCSV,
} from '@/lib/stores/form-store';

// GET /api/forms/[id]/responses - 获取表单响应列表
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  
  try {
    const form = getFormById(id);
    
    if (!form) {
      return NextResponse.json(
        { success: false, error: '表单不存在' },
        { status: 404 }
      );
    }
    
    // 导出 CSV
    if (format === 'csv') {
      const csv = exportFormDataCSV(id);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="form-${form.code}-responses.csv"`,
        },
      });
    }
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const responses = getFormResponses(id, { limit, offset });
    const total = getFormResponseCount(id);
    
    return NextResponse.json({
      success: true,
      data: {
        responses,
        total,
        fields: form.config.fields,
      },
    });
  } catch (error) {
    console.error('Failed to get responses:', error);
    return NextResponse.json(
      { success: false, error: '获取响应失败' },
      { status: 500 }
    );
  }
}

