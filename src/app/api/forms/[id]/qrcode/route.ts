import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getFormById } from '@/lib/stores/form-store';
import { getBaseUrlFromRequest } from '@/lib/utils/get-base-url';

// GET /api/forms/[id]/qrcode - 获取表单二维码
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
    
    const baseUrl = getBaseUrlFromRequest(request);
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
        qrCodeUrl,
        formUrl,
        code: form.code,
      },
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return NextResponse.json(
      { success: false, error: '生成二维码失败' },
      { status: 500 }
    );
  }
}

