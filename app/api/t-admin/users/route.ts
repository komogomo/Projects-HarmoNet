import { NextRequest, NextResponse } from 'next/server';
import { getTenantAdminApiContext, TenantAdminApiError } from '@/src/lib/auth/tenantAdminAuth';
import { sendTenantUserRegistrationEmail } from '@/src/server/services/TenantUserEmailService';

export async function GET(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    // Get users belonging to this tenant
    // Using users.tenant_id as the primary filter as per "1 user = 1 tenant" schema change
    // Use supabaseAdmin to bypass RLS policies that might restrict viewing other users
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select(
        'id, email, display_name, last_name, first_name, last_name_kana, first_name_kana, group_code, residence_code, language',
      )
      .eq('tenant_id', tenantId);

    if (usersError) {
      console.error('Users fetch error:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const userIds = usersData.map((u: any) => u.id);

    // Get user_roles data (use service_role client to ensure admin can see all tenant roles)
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, roles(role_key)')
      .eq('tenant_id', tenantId)
      .in('user_id', userIds);

    if (rolesError) {
      console.error('Roles data fetch error:', rolesError);
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // Create lookup map: user_id -> roleKeys[] (system_admin は除外)
    const roleMap = new Map<string, string[]>();
    rolesData?.forEach((r: any) => {
      const userId = r.user_id as string;
      const roleKey = (r.roles as any)?.role_key as string | undefined;
      if (!roleKey || roleKey === 'system_admin') return;
      const current = roleMap.get(userId) ?? [];
      if (!current.includes(roleKey)) {
        current.push(roleKey);
      }
      roleMap.set(userId, current);
    });

    // Combine data
    const result = (usersData as any[]).reduce((acc: any[], user: any) => {
      // Filter by query if present
      if (query) {
        const q = query.toLowerCase();
        const targetStrings = [
          user.email,
          user.display_name,
          user.last_name,
          user.first_name,
          user.last_name_kana,
          user.first_name_kana,
          user.group_code,
          user.residence_code,
        ];
        const match = targetStrings.some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(q),
        );
        if (!match) {
          return acc;
        }
      }

      const roleKeys = roleMap.get(user.id as string) ?? ['general_user'];
      const langRaw = user.language as string | null;
      const langLower = typeof langRaw === 'string' ? langRaw.toLowerCase() : 'ja';
      const language = langLower === 'en' || langLower === 'zh' ? langLower : 'ja';

      acc.push({
        userId: user.id as string,
        email: (user.email as string) || '',
        displayName: (user.display_name as string) || '',
        lastName: (user.last_name as string) || '',
        firstName: (user.first_name as string) || '',
        lastNameKana: (user.last_name_kana as string) || '',
        firstNameKana: (user.first_name_kana as string) || '',
        groupCode: (user.group_code as string) || null,
        residenceCode: (user.residence_code as string) || null,
        roleKeys,
        language,
      });

      return acc;
    }, [] as any[]);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, supabase, supabaseAdmin } = await getTenantAdminApiContext();

    const body = await request.json();
    const {
      email,
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      displayName,
      groupCode,
      residenceCode,
      roleKeys,
      language,
    } = body as {
      email: string;
      lastName: string;
      firstName: string;
      lastNameKana: string;
      firstNameKana: string;
      displayName: string;
      groupCode?: string | null;
      residenceCode?: string | null;
      roleKeys?: string[];
      language?: string;
    };

    // Validation
    if (
      !email ||
      !lastName ||
      !firstName ||
      !lastNameKana ||
      !firstNameKana ||
      !displayName ||
      !Array.isArray(roleKeys) ||
      roleKeys.length === 0
    ) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: '入力内容を確認してください。' },
        { status: 400 },
      );
    }

    let targetUserId: string;

    // Check for email duplication (Public DB)
    const { data: existingUserWithEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserWithEmail) {
      return NextResponse.json({ ok: false, errorCode: 'CONFLICT', message: 'このメールアドレスは既に使用されています。' }, { status: 409 });
    }

    // Check for display name duplication (Public DB)
    const { data: existingUserWithDisplayName } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('display_name', displayName)
      .maybeSingle();

    if (existingUserWithDisplayName) {
      return NextResponse.json({ ok: false, errorCode: 'CONFLICT', message: 'このニックネームは既に使用されています。' }, { status: 409 });
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        display_name: displayName
      }
    });

    if (createError) {
      const { data: existingPublicUser, error: findError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (findError || !existingPublicUser) {
        // If not found in public.users, check if it exists in auth.users (orphaned auth user)
        // Since we cannot query auth.users directly by email easily, we list users.
        // Note: This is not efficient for large user bases but necessary for recovery here.
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000 // Fetch a batch to find the user
        });

        const foundAuthUser = authUsers?.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        if (listError || !foundAuthUser) {
          console.error("Create user error and not found in public/auth users:", createError);
          return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'ユーザーの作成または検索に失敗しました。' }, { status: 500 });
        }

        targetUserId = foundAuthUser.id;
      } else {
        targetUserId = existingPublicUser.id;
      }
    } else {
      targetUserId = newUser.user.id;
    }

    // 2. Upsert public.users
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: targetUserId,
        tenant_id: tenantId, // Required now
        email,
        display_name: displayName,
        last_name: lastName,
        first_name: firstName,
        last_name_kana: lastNameKana,
        first_name_kana: firstNameKana,
        group_code: groupCode ?? '',
        residence_code: residenceCode ?? '',
        language: language || 'ja',
        updated_at: new Date().toISOString(),
      });

    if (usersError) {
      console.error("Users upsert error:", usersError);
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'usersテーブルの更新に失敗しました。' }, { status: 500 });
    }

    // 3. Upsert user_roles (複数ロール対応, system_admin は除外)
    const normalizedRoleKeys = Array.from(
      new Set(
        (roleKeys as string[])
          .filter((key) => typeof key === 'string')
          .map((key) => key.trim())
          .filter((key) => key && key !== 'system_admin'),
      ),
    );

    const { data: roleRows, error: rolesFetchError } = await supabase
      .from('roles')
      .select('id, role_key')
      .in('role_key', normalizedRoleKeys);

    if (rolesFetchError || !roleRows || roleRows.length === 0) {
      return NextResponse.json(
        { ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロールが見つかりません。' },
        { status: 500 },
      );
    }

    const insertUserRoles = roleRows.map((row: any) => ({
      user_id: targetUserId,
      tenant_id: tenantId,
      role_id: row.id,
    }));

    const { error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .insert(insertUserRoles);

    if (userRolesError) {
      console.error("User roles insert error:", userRolesError);
      return NextResponse.json(
        { ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロール設定に失敗しました。' },
        { status: 500 },
      );
    }

    // 4. Upsert user_tenants
    const { error: userTenantsError } = await supabaseAdmin
      .from('user_tenants')
      .insert({
        user_id: targetUserId,
        tenant_id: tenantId
      });

    if (userTenantsError) {
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'テナント所属設定に失敗しました。' }, { status: 500 });
    }

    try {
      await sendTenantUserRegistrationEmail({
        to: email,
        firstName,
        lastName,
      });
    } catch (emailError) {
      console.error('Tenant user registration email send error:', emailError);
    }

    return NextResponse.json({ ok: true, message: 'ユーザを登録しました。' });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
      }
    }

    throw error;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, supabase, supabaseAdmin } = await getTenantAdminApiContext();

    const body = await request.json();
    const {
      userId,
      email,
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      displayName,
      groupCode,
      residenceCode,
      roleKeys,
      language,
    } = body as {
      userId: string;
      email: string;
      lastName: string;
      firstName: string;
      lastNameKana: string;
      firstNameKana: string;
      displayName: string;
      groupCode?: string | null;
      residenceCode?: string | null;
      roleKeys?: string[];
      language?: string;
    };

    // Validation
    if (
      !userId ||
      !email ||
      !lastName ||
      !firstName ||
      !lastNameKana ||
      !firstNameKana ||
      !displayName ||
      !Array.isArray(roleKeys) ||
      roleKeys.length === 0
    ) {
      return NextResponse.json(
        { ok: false, errorCode: 'VALIDATION_ERROR', message: '入力内容を確認してください。' },
        { status: 400 },
      );
    }

    // Check for email duplication (Public DB)
    const { data: existingUserWithEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', userId) // Exclude self
      .maybeSingle();

    if (existingUserWithEmail) {
      return NextResponse.json({ ok: false, errorCode: 'CONFLICT', message: 'このメールアドレスは既に使用されています。' }, { status: 409 });
    }

    // Check for display name duplication (Public DB)
    const { data: existingUserWithDisplayName } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('display_name', displayName)
      .neq('id', userId) // Exclude self
      .maybeSingle();

    if (existingUserWithDisplayName) {
      return NextResponse.json({ ok: false, errorCode: 'CONFLICT', message: 'このニックネームは既に使用されています。' }, { status: 409 });
    }

    // Verify target user belongs to this tenant
    const { data: targetUserTenant, error: targetCheckError } = await supabaseAdmin
      .from('user_tenants')
      .select('user_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (targetCheckError || !targetUserTenant) {
      return NextResponse.json({ ok: false, errorCode: 'FORBIDDEN', message: 'このユーザを操作する権限がありません。' }, { status: 403 });
    }

    // Fetch current user data for optimization
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('email, display_name')
      .eq('id', userId)
      .single();

    // 0. Update auth.users (email, metadata)
    // Only if email or display_name changed
    if (currentUser && (currentUser.email !== email || currentUser.display_name !== displayName)) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email,
        email_confirm: true, // Auto-confirm email change by admin
        user_metadata: {
          display_name: displayName
        }
      });

      if (authUpdateError) {
        console.error("Auth update error:", authUpdateError);
        return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: '認証情報の更新に失敗しました。' + authUpdateError.message }, { status: 500 });
      }
    }

    // 1. Update public.users
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .update({
        email,
        display_name: displayName,
        last_name: lastName,
        first_name: firstName,
        last_name_kana: lastNameKana,
        first_name_kana: firstNameKana,
        group_code: groupCode ?? '',
        residence_code: residenceCode ?? '',
        language: language || 'ja',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('tenant_id', tenantId); // Ensure user belongs to this tenant

    if (usersError) {
      console.error("Users update error:", usersError);
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'usersテーブルの更新に失敗しました。' }, { status: 500 });
    }

    // 2. Update user_roles (複数ロール対応, system_admin は除外)
    const normalizedRoleKeys = Array.from(
      new Set(
        (roleKeys as string[])
          .filter((key) => typeof key === 'string')
          .map((key) => key.trim())
          .filter((key) => key && key !== 'system_admin'),
      ),
    );

    // 既存のロール割り当てから、system_admin 以外だけを削除する
    const { data: existingUserRoles, error: existingUserRolesError } = await supabaseAdmin
      .from('user_roles')
      // user_roles には単一の id カラムはなく、(user_id, tenant_id, role_id) の複合キー構成なので
      // role_id と紐づく roles.role_key を取得して削除対象を決定する。
      .select('role_id, roles(role_key)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (existingUserRolesError) {
      console.error('Existing user_roles fetch error:', existingUserRolesError);
      return NextResponse.json(
        { ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロール情報の取得に失敗しました。' },
        { status: 500 },
      );
    }

    const deletableRoleIds = (existingUserRoles ?? [])
      .filter((ur: any) => {
        const roleKey = (ur.roles as any)?.role_key as string | undefined;
        return roleKey && roleKey !== 'system_admin';
      })
      .map((ur: any) => ur.role_id as string)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

    if (deletableRoleIds.length > 0) {
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .in('role_id', deletableRoleIds);
    }

    if (normalizedRoleKeys.length > 0) {
      const { data: roleRows, error: rolesFetchError } = await supabase
        .from('roles')
        .select('id, role_key')
        .in('role_key', normalizedRoleKeys);

      if (rolesFetchError || !roleRows || roleRows.length === 0) {
        return NextResponse.json(
          { ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロールが見つかりません。' },
          { status: 500 },
        );
      }

      const insertUserRoles = roleRows.map((row: any) => ({
        user_id: userId,
        tenant_id: tenantId,
        role_id: row.id,
      }));

      const { error: userRolesError } = await supabaseAdmin
        .from('user_roles')
        .insert(insertUserRoles);

      if (userRolesError) {
        return NextResponse.json(
          { ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロール更新に失敗しました。' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true, message: 'ユーザ情報を更新しました。' });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'FORBIDDEN', message: 'このユーザを操作する権限がありません。' }, { status: 403 });
      }
    }

    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId, supabaseAdmin } = await getTenantAdminApiContext();

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ ok: false, message: 'User ID required' }, { status: 400 });
    }

    // Verify target user belongs to this tenant
    const { data: targetUser, error: targetCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (targetCheckError || !targetUser) {
      return NextResponse.json({ ok: false, errorCode: 'FORBIDDEN', message: 'このユーザを操作する権限がありません。' }, { status: 403 });
    }

    // First, delete tenant-specific data
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId).eq('tenant_id', tenantId);

    // Then delete from user_tenants
    const { error: deleteError } = await supabaseAdmin
      .from('user_tenants')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      return NextResponse.json({ ok: false, message: '削除に失敗しました。' }, { status: 500 });
    }

    // Check if user belongs to other tenants
    const { count, error: countError } = await supabaseAdmin
      .from('user_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('user_tenants count error during delete:', countError);
      return NextResponse.json(
        { ok: false, errorCode: 'INTERNAL_ERROR', message: 'ユーザの削除に失敗しました。' },
        { status: 500 },
      );
    }

    if (count === 0) {
      // Completely remove user - no other tenants
      const { error: usersDeleteError } = await supabaseAdmin.from('users').delete().eq('id', userId);

      if (usersDeleteError) {
        console.error('Users hard delete error:', usersDeleteError);
        // 代表的なケースとしては掲示板投稿など他テーブルからの参照が残っている
        return NextResponse.json(
          {
            ok: false,
            errorCode: 'INTERNAL_ERROR',
            message: '関連データが存在するため、このユーザを削除できません。',
          },
          { status: 500 },
        );
      }

      // auth 側に存在しないユーザもいるため、auth 削除エラーはログのみにとどめる
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.warn('Auth deleteUser error (ignored):', authDeleteError.message);
      }
    }

    return NextResponse.json({ ok: true, message: 'ユーザを削除しました。' });
  } catch (error) {
    if (error instanceof TenantAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'tenant_not_found') {
        return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ ok: false, errorCode: 'FORBIDDEN', message: 'このユーザを操作する権限がありません。' }, { status: 403 });
      }
    }

    throw error;
  }
}
