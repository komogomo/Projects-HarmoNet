import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/src/server/services/SesEmailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const to = typeof body.to === 'string' ? body.to : undefined;

    if (!to) {
      return NextResponse.json(
        { ok: false, message: 'Field "to" is required in request body.' },
        { status: 400 },
      );
    }

    await sendEmail({
      to,
      subject: 'HarmoNet SES テストメール',
      text: 'このメールが届いていれば、HarmoNet から AWS SES 経由での送信が成功しています。',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
