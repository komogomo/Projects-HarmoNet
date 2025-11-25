import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

interface RouteParams {
  params: Promise<{
    attachmentId: string;
  }>;
}

export async function GET(req: Request, props: RouteParams) {
  const { params } = props;
  const { attachmentId } = await params;

  if (!attachmentId) {
    return NextResponse.json({ errorCode: 'validation_error' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError('board.attachment.api.auth_error', {
        reason: authError?.message ?? 'no_session',
      });
      return NextResponse.json({ errorCode: 'auth_error' }, { status: 401 });
    }

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'active')
      .maybeSingle();

    if (appUserError || !appUser) {
      logError('board.attachment.api.user_not_found', {
        email: user.email,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', appUser.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError('board.attachment.api.membership_error', {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const tenantId = membership.tenant_id as string;

    const attachment = await prisma.board_attachments.findFirst({
      where: {
        id: attachmentId,
        tenant_id: tenantId,
      },
      select: {
        file_url: true,
        file_name: true,
        file_type: true,
        file_size: true,
        post_id: true,
      },
    });

    if (!attachment) {
      return NextResponse.json({ errorCode: 'not_found' }, { status: 404 });
    }

    const post = await prisma.board_posts.findFirst({
      where: {
        id: attachment.post_id,
        tenant_id: tenantId,
        status: 'published',
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: 'forbidden' }, { status: 403 });
    }

    const serviceRoleSupabase = createSupabaseServiceRoleClient();
    const storageBucket = serviceRoleSupabase.storage.from('board-attachments');

    const { data, error } = await storageBucket.download(attachment.file_url);

    if (error || !data) {
      logError('board.attachment.api.download_error', {
        tenantId,
        attachmentId,
        errorMessage: error?.message,
      });
      return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
    }

    const arrayBuffer = await (data as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const headers = new Headers();
    headers.set('Content-Type', attachment.file_type || 'application/octet-stream');
    headers.set('Content-Length', String(attachment.file_size));

    const encodedFileName = encodeURIComponent(attachment.file_name);
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodedFileName}`);

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    logError('board.attachment.api.unexpected_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
