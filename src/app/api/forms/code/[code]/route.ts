import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getFormByCode } from '@/lib/stores/form-store';

// GET /api/forms/code/[code] - 根据短码获取表单
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  try {
    const form = getFormByCode(code);
    
    if (!form) {
      return NextResponse.json(
        { success: false, error: '表单不存在' },
        { status: 404 }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const formUrl = `${baseUrl}/f/${form.code}`;
    
    const qrCodeUrl = await QRCode.toDataURL(formUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        ...form,
        qrCodeUrl,
        formUrl,
      },
    });
  } catch (error) {
    console.error('Failed to get form by code:', error);
    return NextResponse.json(
      { success: false, error: '获取表单失败' },
      { status: 500 }
    );
  }
}

