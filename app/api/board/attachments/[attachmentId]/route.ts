import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createSupabaseServiceRoleClient } from '@/src/lib/supabaseServiceRoleClient';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import { prisma } from '@/src/server/db/prisma';

interface RouteParams {
  params: Promise<{
    attachmentId: string;
  }>;
}

export async function GET(req: Request, props: RouteParams) {
  const { params } = props;
  const { attachmentId } = await params;

  const url = new URL(req.url);
  const isInline = url.searchParams.get('inline') === '1';

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
      .maybeSingle();

    if (appUserError || !appUser) {
      logError('board.attachment.api.user_not_found', {
        userId: user.id,
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
      },
      select: {
        id: true,
        author_id: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: 'not_found' }, { status: 404 });
    }

    // 権限制御: BoardDetail と同様に、
    // - 一般利用者: 公開済み投稿のみ
    // - 管理ロール or 投稿者本人: pending 等も含めて閲覧可能
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('roles(role_key)')
      .eq('user_id', appUser.id)
      .eq('tenant_id', tenantId);

    const hasAdminRole =
      userRoles?.some(
        (r: any) => r.roles?.role_key === 'tenant_admin' || r.roles?.role_key === 'system_admin',
      ) ?? false;

    const isAuthor = post.author_id === appUser.id;
    const rawStatus = (post as any).status as string | null;
    const normalizedStatus =
      rawStatus === 'draft' || rawStatus === 'pending' || rawStatus === 'archived'
        ? rawStatus
        : 'published';

    if (normalizedStatus !== 'published' && !isAuthor && !hasAdminRole) {
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
    headers.set(
      'Content-Disposition',
      `${isInline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodedFileName}`,
    );

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

export async function DELETE(req: Request, props: RouteParams) {
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
      logError('board.attachment.delete.auth_error', {
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
      .maybeSingle();

    if (appUserError || !appUser) {
      logError('board.attachment.delete.user_not_found', {
        userId: user.id,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const attachment = await prisma.board_attachments.findFirst({
      where: {
        id: attachmentId,
      },
      select: {
        tenant_id: true,
        post_id: true,
        file_url: true,
      },
    });

    if (!attachment) {
      return NextResponse.json({ errorCode: 'not_found' }, { status: 404 });
    }

    const tenantId = attachment.tenant_id as string;

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', appUser.id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError('board.attachment.delete.membership_error', {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: 'unauthorized' }, { status: 403 });
    }

    const post = await prisma.board_posts.findFirst({
      where: {
        id: attachment.post_id,
        tenant_id: tenantId,
      },
      select: {
        author_id: true,
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: 'post_not_found' }, { status: 404 });
    }

    const isAuthor = post.author_id === appUser.id;

    let hasAdminRole = false;
    try {
      const {
        data: userRoles,
        error: userRolesError,
      } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', appUser.id)
        .eq('tenant_id', tenantId);

      if (!userRolesError && userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
        const roleIds = userRoles
          .map((row: any) => row.role_id)
          .filter((id: unknown): id is string => typeof id === 'string');

        if (roleIds.length > 0) {
          const {
            data: roles,
            error: rolesError,
          } = await supabase
            .from('roles')
            .select('id, role_key')
            .in('id', roleIds as string[]);

          if (!rolesError && roles && Array.isArray(roles)) {
            hasAdminRole = roles.some(
              (role: any) =>
                role.role_key === 'tenant_admin' || role.role_key === 'system_admin',
            );
          }
        }
      }
    } catch {
      hasAdminRole = false;
    }

    if (!isAuthor && !hasAdminRole) {
      return NextResponse.json({ errorCode: 'forbidden' }, { status: 403 });
    }

    const serviceRoleSupabase = createSupabaseServiceRoleClient();
    const storageBucket = serviceRoleSupabase.storage.from('board-attachments');

    const { error: removeError } = await storageBucket.remove([attachment.file_url]);

    if (removeError) {
      logError('board.attachment.delete.remove_failed', {
        tenantId,
        attachmentId,
        errorMessage: removeError.message ?? String(removeError),
      });
      return NextResponse.json({ errorCode: 'attachment_delete_failed' }, { status: 500 });
    }

    await prisma.board_attachments.delete({
      where: {
        id: attachmentId,
      },
    });

    logInfo('board.attachment.delete.success', {
      tenantId,
      attachmentId,
      userId: appUser.id,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logError('board.attachment.delete.unexpected_error', {
      attachmentId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: 'server_error' }, { status: 500 });
  }
}
