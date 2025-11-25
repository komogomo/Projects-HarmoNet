export async function getActiveTenantIdsForUser(
  supabase: any,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !data) {
    return [];
  }

  return data
    .map((row: { tenant_id: string | null }) => row.tenant_id)
    .filter((tenantId: string | null): tenantId is string => typeof tenantId === 'string' && tenantId.length > 0);
}
