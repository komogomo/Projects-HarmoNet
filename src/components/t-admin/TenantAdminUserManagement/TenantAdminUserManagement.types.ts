export type TenantAdminUserManagementProps = {
    tenantId: string;
    tenantName: string;
};

export type UserListItem = {
    userId: string;
    email: string;
    displayName: string;
    lastName: string;
    firstName: string;
    lastNameKana: string;
    firstNameKana: string;
    groupCode: string | null;
    residenceCode: string | null;
    roleKeys: string[]; // system_admin 以外のロールキー一覧
    language: string;
};

export type UserFormData = {
    email: string;
    displayName: string;
    lastName: string;
    firstName: string;
    lastNameKana: string;
    firstNameKana: string;
    groupCode: string;
    residenceCode: string;
    roleKeys: string[];
    language: string;
};
