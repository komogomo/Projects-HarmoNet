export type TenantAdminUserManagementProps = {
    tenantId: string;
    tenantName: string;
};

export type UserListItem = {
    userId: string;
    email: string;
    displayName: string;
    fullName: string;
    fullNameKana: string;
    groupCode: string | null;
    residenceCode: string | null;
    roleKey: string;
    language: string;
};

export type UserFormData = {
    email: string;
    fullName: string;
    fullNameKana: string;
    displayName: string;
    groupCode: string;
    residenceCode: string;
    roleKey: string;
    language: string;
};
