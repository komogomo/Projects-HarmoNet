import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';
import { createClient } from '@supabase/supabase-js';

// Admin client for auth management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get tenant_id from user_tenants (or users table if preferred, but user_tenants is standard for session context)
  const { data: userTenant, error: utError } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (utError || !userTenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
  }

  const tenantId = userTenant.tenant_id;

  // Check if user is tenant_admin
  const { data: userRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('roles(role_key)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId);

  if (roleError) {
    return NextResponse.json({ error: 'Error fetching roles' }, { status: 500 });
  }

  const isTenantAdmin = userRoles?.some((r: any) => r.roles?.role_key === 'tenant_admin');

  if (!isTenantAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  // Get users belonging to this tenant
  // Using users.tenant_id as the primary filter as per "1 user = 1 tenant" schema change
  // Use supabaseAdmin to bypass RLS policies that might restrict viewing other users
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, email, display_name, full_name, full_name_kana, group_code, residence_code, language')
    .eq('tenant_id', tenantId);

  if (usersError) {
    console.error('Users fetch error:', usersError);
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  if (!usersData || usersData.length === 0) {
    return NextResponse.json([]);
  }

  const userIds = usersData.map(u => u.id);

  // Get user_roles data
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, roles(role_key)')
    .eq('tenant_id', tenantId)
    .in('user_id', userIds);

  if (rolesError) {
    console.error('Roles data fetch error:', rolesError);
    return NextResponse.json({ error: rolesError.message }, { status: 500 });
  }

  // Create lookup maps
  const roleMap = new Map();
  rolesData?.forEach((r: any) => {
    roleMap.set(r.user_id, r.roles?.role_key);
  });

  // Combine data
  const result = usersData.map(user => {
    // Filter by query if present
    if (query) {
      const q = query.toLowerCase();
      const match =
        user.email?.toLowerCase().includes(q) ||
        user.display_name?.toLowerCase().includes(q) ||
        user.full_name?.toLowerCase().includes(q);
      if (!match) return null;
    }

    return {
      userId: user.id,
      email: user.email || '',
      displayName: user.display_name || '',
      fullName: user.full_name || '',
      fullNameKana: user.full_name_kana || '',
      groupCode: user.group_code || null,
      residenceCode: user.residence_code || null,
      roleKey: roleMap.get(user.id) || 'general_user',
      language: user.language || 'ja',
    };
  }).filter(Boolean);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  // Tenant check
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!userTenant) return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });
  const tenantId = userTenant.tenant_id;

  const body = await request.json();
  const { email, fullName, fullNameKana, displayName, groupCode, residenceCode, roleKey, language } = body;

  // Validation
  if (!email || !fullName || !fullNameKana || !displayName || !roleKey) {
    return NextResponse.json({ ok: false, errorCode: 'VALIDATION_ERROR', message: '入力内容を確認してください。' }, { status: 400 });
  }

  let targetUserId: string;

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
      console.error("Create user error and not found in public users:", createError);
      return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'ユーザーの作成または検索に失敗しました。' }, { status: 500 });
    }
    targetUserId = existingPublicUser.id;
  } else {
    targetUserId = newUser.user.id;
  }

  // 2. Upsert public.users
  const { error: usersError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: targetUserId,
      tenant_id: tenantId, // Required now
      email: email,
      display_name: displayName,
      full_name: fullName,
      full_name_kana: fullNameKana,
      group_code: groupCode,
      residence_code: residenceCode,
      language: language || 'ja',
      updated_at: new Date().toISOString()
    });

  if (usersError) {
    console.error("Users upsert error:", usersError);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'usersテーブルの更新に失敗しました。' }, { status: 500 });
  }

  // 3. Upsert user_roles
  const { data: roleData, error: roleFetchError } = await supabase
    .from('roles')
    .select('id')
    .eq('role_key', roleKey)
    .single();

  if (roleFetchError || !roleData) {
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロールが見つかりません。' }, { status: 500 });
  }

  const { error: userRolesError } = await supabaseAdmin
    .from('user_roles')
    .upsert({
      user_id: targetUserId,
      tenant_id: tenantId,
      role_id: roleData.id
    }, { onConflict: 'user_id, tenant_id' });

  if (userRolesError) {
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロール設定に失敗しました。' }, { status: 500 });
  }

  // 4. Upsert user_tenants
  const { error: userTenantsError } = await supabaseAdmin
    .from('user_tenants')
    .upsert({
      user_id: targetUserId,
      tenant_id: tenantId
    }, { onConflict: 'user_id, tenant_id' });

  if (userTenantsError) {
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'テナント所属設定に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'ユーザを登録しました。' });
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, errorCode: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  // Tenant check
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!userTenant) return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });
  const tenantId = userTenant.tenant_id;

  const body = await request.json();
  const { userId, email, fullName, fullNameKana, displayName, groupCode, residenceCode, roleKey, language } = body;

  // Validation
  if (!userId || !email || !fullName || !fullNameKana || !displayName || !roleKey) {
    return NextResponse.json({ ok: false, errorCode: 'VALIDATION_ERROR', message: '入力内容を確認してください。' }, { status: 400 });
  }

  // 1. Update public.users
  const { error: usersError } = await supabaseAdmin
    .from('users')
    .update({
      email: email,
      display_name: displayName,
      full_name: fullName,
      full_name_kana: fullNameKana,
      group_code: groupCode,
      residence_code: residenceCode,
      language: language || 'ja',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .eq('tenant_id', tenantId); // Ensure user belongs to this tenant

  if (usersError) {
    console.error("Users update error:", usersError);
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'usersテーブルの更新に失敗しました。' }, { status: 500 });
  }

  // 2. Update user_roles
  const { data: roleData, error: roleFetchError } = await supabase
    .from('roles')
    .select('id')
    .eq('role_key', roleKey)
    .single();

  if (roleFetchError || !roleData) {
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロールが見つかりません。' }, { status: 500 });
  }

  // Delete existing role and insert new one (simplest way to update role in many-to-many if unique constraint exists)
  // Or upsert if unique constraint is [user_id, tenant_id, role_id] but we want only one role per tenant usually?
  // Schema says: @@unique([user_id, tenant_id, role_id])
  // But logic implies one main role. Let's stick to the pattern used in POST: upsert or delete/insert.
  // Since we want to REPLACE the role for this tenant, we should probably delete old roles for this tenant and insert new one.

  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId).eq('tenant_id', tenantId);

  const { error: userRolesError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      role_id: roleData.id
    });

  if (userRolesError) {
    return NextResponse.json({ ok: false, errorCode: 'INTERNAL_ERROR', message: 'ロール更新に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'ユーザ情報を更新しました。' });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  if (!userTenant) return NextResponse.json({ ok: false, message: 'Tenant not found' }, { status: 403 });
  const tenantId = userTenant.tenant_id;

  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ ok: false, message: 'User ID required' }, { status: 400 });
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

  if (!countError && count === 0) {
    // Completely remove user - no other tenants
    await supabaseAdmin.from('users').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }

  return NextResponse.json({ ok: true, message: 'ユーザを削除しました。' });
}
