import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未选择文件' },
        { status: 400 }
      );
    }

    const ext = file.name.toLowerCase();

    if (ext.endsWith('.txt')) {
      const content = await file.text();
      return NextResponse.json({ success: true, data: { content } });
    }

    if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ success: true, data: { content: result.value } });
    }

    return NextResponse.json(
      { success: false, error: '不支持的文件格式，请上传 .txt 或 .docx 文件' },
      { status: 400 }
    );
  } catch (error) {
    console.error('File parse error:', error);
    return NextResponse.json(
      { success: false, error: '文件解析失败，请检查文件格式' },
      { status: 500 }
    );
  }
}
