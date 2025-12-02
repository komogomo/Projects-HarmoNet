
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock next/headers to avoid cookies() error
vi.mock('next/headers', () => ({
    cookies: () => ({
        getAll: () => [],
        set: () => { },
    }),
}));

// Mock dependencies BEFORE imports
const mockAdminClient = {
    from: vi.fn(),
    auth: {
        admin: {
            deleteUser: vi.fn(),
        },
    },
};

// Mock supabaseServerClient
vi.mock('@/src/lib/supabaseServerClient', () => ({
    createSupabaseServerClient: vi.fn().mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null }),
        },
    }),
}));

// Mock systemAdminAuth
vi.mock('@/src/lib/auth/systemAdminAuth', () => {
    return {
        getSystemAdminApiContext: vi.fn().mockImplementation(async () => {
            return { adminClient: mockAdminClient };
        }),
        SystemAdminApiError: class extends Error {
            code: string;
            constructor(message: string, code: string) {
                super(message);
                this.code = code;
            }
        },
    };
});

// Import handlers AFTER mocking
import { POST as createTenant } from '../../../app/api/sys-admin/tenants/route';
import { DELETE as deleteTenant } from '../../../app/api/sys-admin/tenants/[tenantId]/route';

describe('Tenant Lifecycle API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/sys-admin/tenants (Creation)', () => {
        it('should create tenant and tenant_settings successfully', async () => {
            // Mock request
            const req = new Request('http://localhost/api/sys-admin/tenants', {
                method: 'POST',
                body: JSON.stringify({
                    tenantName: 'Test Tenant',
                    tenantCode: 'test-tenant',
                    timezone: 'Asia/Tokyo',
                }),
            });

            // Mock database responses
            const mockTenantId = 'new-tenant-id';

            // Chain mocks for supabase client
            const mockInsert = vi.fn();
            const mockSelect = vi.fn();
            const mockSingle = vi.fn();
            const tenantSettingsInsertSpy = vi.fn().mockResolvedValue({ error: null });

            mockAdminClient.from.mockImplementation((table: string) => {
                if (table === 'tenants') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No existing tenant
                            }),
                        }),
                        insert: mockInsert.mockReturnValue({
                            select: mockSelect.mockReturnValue({
                                single: mockSingle.mockResolvedValue({ data: { id: mockTenantId }, error: null }),
                            }),
                        }),
                        delete: vi.fn().mockReturnValue({ eq: vi.fn() }), // For rollback
                    };
                }
                if (table === 'board_categories') {
                    return { insert: vi.fn().mockResolvedValue({ error: null }) };
                }
                if (table === 'tenant_settings') {
                    return { insert: tenantSettingsInsertSpy };
                }
                return { insert: vi.fn(), select: vi.fn(), delete: vi.fn() };
            });

            // Execute
            const res = await createTenant(req as any);
            const body = await res.json();

            // Assert
            expect(res.status).toBe(200);
            expect(body.ok).toBe(true);
            expect(body.tenantId).toBe(mockTenantId);

            // Verify tenant_settings creation
            expect(mockAdminClient.from).toHaveBeenCalledWith('tenant_settings');
            expect(tenantSettingsInsertSpy).toHaveBeenCalled();
            const insertCall = tenantSettingsInsertSpy.mock.calls[0][0];
            expect(insertCall.config_json).toEqual({
                board: { moderation: { enabled: true, level: 1 } },
                facility: { usageNotes: {} },
            });
        });

        it('should pass an ID when inserting tenant_settings', async () => {
            // Mock request
            const req = new Request('http://localhost/api/sys-admin/tenants', {
                method: 'POST',
                body: JSON.stringify({
                    tenantName: 'Test Tenant',
                    tenantCode: 'test-tenant',
                    timezone: 'Asia/Tokyo',
                }),
            });

            const mockTenantId = 'new-tenant-id';
            const tenantSettingsInsertSpy = vi.fn().mockResolvedValue({ error: null });

            mockAdminClient.from.mockImplementation((table: string) => {
                if (table === 'tenants') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                            }),
                        }),
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: { id: mockTenantId }, error: null }),
                            }),
                        }),
                        delete: vi.fn().mockReturnValue({ eq: vi.fn() }),
                    };
                }
                if (table === 'board_categories') {
                    return { insert: vi.fn().mockResolvedValue({ error: null }) };
                }
                if (table === 'tenant_settings') {
                    return { insert: tenantSettingsInsertSpy };
                }
                return { insert: vi.fn(), select: vi.fn(), delete: vi.fn() };
            });

            await createTenant(req as any);

            expect(tenantSettingsInsertSpy).toHaveBeenCalled();
            const insertArg = tenantSettingsInsertSpy.mock.calls[0][0];
            expect(insertArg).toHaveProperty('id');
            expect(typeof insertArg.id).toBe('string');
            expect(insertArg.id.length).toBeGreaterThan(0);
        });

        it('should rollback tenant creation if tenant_settings creation fails', async () => {
            // Mock request
            const req = new Request('http://localhost/api/sys-admin/tenants', {
                method: 'POST',
                body: JSON.stringify({
                    tenantName: 'Fail Tenant',
                    tenantCode: 'fail-tenant',
                    timezone: 'Asia/Tokyo',
                }),
            });

            const mockTenantId = 'fail-tenant-id';
            const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

            mockAdminClient.from.mockImplementation((table: string) => {
                if (table === 'tenants') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                            }),
                        }),
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: { id: mockTenantId }, error: null }),
                            }),
                        }),
                        delete: mockDelete,
                    };
                }
                if (table === 'board_categories') {
                    return { insert: vi.fn().mockResolvedValue({ error: null }) };
                }
                if (table === 'tenant_settings') {
                    return { insert: vi.fn().mockResolvedValue({ error: 'DB Error' }) };
                }
                return { insert: vi.fn() };
            });

            // Execute
            const res = await createTenant(req as any);

            // Assert
            expect(res.status).toBe(500);

            // Verify rollback (delete tenant)
            expect(mockDelete).toHaveBeenCalled();
        });
    });

    describe('DELETE /api/sys-admin/tenants/[tenantId] (Deletion)', () => {
        it('should skip auth deletion for non-UUID user IDs', async () => {
            const tenantId = 'target-tenant-id';
            const req = new Request(`http://localhost/api/sys-admin/tenants/${tenantId}`, {
                method: 'DELETE',
            });

            const mockUsers = [
                { id: 'valid-uuid-1234-5678' }, // Valid (mocked format for simplicity, regex check in code)
                { id: 'invalid-id' },           // Invalid
            ];

            // Mock deleteUser
            mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

            // Mock DB calls
            mockAdminClient.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
                        }),
                        delete: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                }
                // Mock other tables delete
                return {
                    delete: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    }),
                };
            });

            // We need to spy on console.log or just verify deleteUser call count
            // The code checks /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            // So 'valid-uuid-1234-5678' is actually invalid regex-wise.
            // Let's use a real UUID for the valid one.
            const realUUID = '12345678-1234-1234-1234-1234567890ab';
            mockUsers[0].id = realUUID;

            await deleteTenant(req as any, { params: Promise.resolve({ tenantId }) });

            // Assert
            // Should be called for realUUID
            expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(realUUID);
            // Should NOT be called for 'invalid-id'
            expect(mockAdminClient.auth.admin.deleteUser).not.toHaveBeenCalledWith('invalid-id');
        });
    });
});
