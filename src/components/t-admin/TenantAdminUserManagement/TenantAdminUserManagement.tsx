"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronsUpDown, TriangleAlert } from 'lucide-react';
import { useI18n, useTenantStaticTranslations } from '@/src/components/common/StaticI18nProvider';
import type { TenantAdminUserManagementProps, UserListItem, UserFormData } from './TenantAdminUserManagement.types';

export const TenantAdminUserManagement: React.FC<TenantAdminUserManagementProps> = ({ tenantId, tenantName }) => {
    const { t, currentLocale } = useI18n();
    useTenantStaticTranslations({ tenantId, apiPath: 't-admin-users' });
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [groupOptions, setGroupOptions] = useState<string[]>([]);
    const [residenceOptions, setResidenceOptions] = useState<string[]>([]);

    const [formData, setFormData] = useState<UserFormData>({
        email: '',
        displayName: '',
        lastName: '',
        firstName: '',
        lastNameKana: '',
        firstNameKana: '',
        groupCode: '',
        residenceCode: '',
        roleKeys: ['general_user'],
        language: 'ja',
        status: 'active',
    });

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/t-admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                setMessage({ type: 'error', text: 'tadmin.users.error.internal' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'tadmin.users.error.internal' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        const loadGroups = async () => {
            try {
                const res = await fetch('/api/t-admin/groups');
                if (!res.ok) {
                    setGroupOptions([]);
                    return;
                }

                const data = (await res.json().catch(() => ({}))) as {
                    ok?: boolean;
                    items?: { groupCode?: string | null }[];
                };

                if (!data.ok || !Array.isArray(data.items)) {
                    setGroupOptions([]);
                    return;
                }

                const codes = Array.from(
                    new Set(
                        data.items
                            .map((item) => (typeof item.groupCode === 'string' ? item.groupCode : ''))
                            .filter((code) => code && code.trim().length > 0),
                    ),
                ).sort();

                setGroupOptions(codes);
            } catch {
                setGroupOptions([]);
            }
        };

        const loadResidences = async () => {
            try {
                const res = await fetch('/api/t-admin/residences');
                if (!res.ok) {
                    setResidenceOptions([]);
                    return;
                }

                const data = (await res.json().catch(() => ({}))) as {
                    ok?: boolean;
                    items?: { residenceCode?: string | null }[];
                };

                if (!data.ok || !Array.isArray(data.items)) {
                    setResidenceOptions([]);
                    return;
                }

                const codes = Array.from(
                    new Set(
                        data.items
                            .map((item) => (typeof item.residenceCode === 'string' ? item.residenceCode : ''))
                            .filter((code) => code && code.trim().length > 0),
                    ),
                ).sort();

                setResidenceOptions(codes);
            } catch {
                setResidenceOptions([]);
            }
        };

        void loadGroups();
        void loadResidences();
    }, []);

    const [initialFormData, setInitialFormData] = useState<UserFormData | null>(null);

    const handleEdit = (user: UserListItem) => {
        setEditingId(user.userId);
        const newFormData: UserFormData = {
            email: user.email,
            displayName: user.displayName,
            // 既存データでは DB 上の first_name / first_name_kana 側に「性」が入っているため、
            // フォーム上では lastName を user.firstName, firstName を user.lastName として扱う。
            lastName: user.firstName,
            firstName: user.lastName,
            lastNameKana: user.firstNameKana,
            firstNameKana: user.lastNameKana,
            groupCode: user.groupCode || '',
            residenceCode: user.residenceCode || '',
            roleKeys: user.roleKeys && user.roleKeys.length > 0 ? user.roleKeys : ['general_user'],
            language: user.language,
            status: user.status === 'inactive' ? 'inactive' : 'active',
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
        setMessage(null);
        // Scroll to top to show form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setInitialFormData(null);
        setFormData({
            email: '',
            displayName: '',
            lastName: '',
            firstName: '',
            lastNameKana: '',
            firstNameKana: '',
            groupCode: '',
            residenceCode: '',
            roleKeys: ['general_user'],
            language: 'ja',
            status: 'active',
        });
        setMessage(null);
    };

    const isDirty = () => {
        if (!initialFormData) return true; // Not editing or just started

        const normalizeRoles = (keys: string[]) => Array.from(new Set(keys)).sort();

        return (
            formData.email !== initialFormData.email ||
            formData.displayName !== initialFormData.displayName ||
            formData.lastName !== initialFormData.lastName ||
            formData.firstName !== initialFormData.firstName ||
            formData.lastNameKana !== initialFormData.lastNameKana ||
            formData.firstNameKana !== initialFormData.firstNameKana ||
            formData.groupCode !== initialFormData.groupCode ||
            formData.residenceCode !== initialFormData.residenceCode ||
            formData.language !== initialFormData.language ||
            formData.status !== initialFormData.status ||
            JSON.stringify(normalizeRoles(formData.roleKeys)) !==
                JSON.stringify(normalizeRoles(initialFormData.roleKeys))
        );
    };

    const [emailExists, setEmailExists] = useState(true);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    const [selectedAvailableRoleKeys, setSelectedAvailableRoleKeys] = useState<string[]>([]);
    const [selectedAssignedRoleKeys, setSelectedAssignedRoleKeys] = useState<string[]>([]);

    useEffect(() => {
        const checkEmail = async () => {
            if (!formData.email) {
                setEmailExists(true); // Or false, but required validation handles empty
                return;
            }

            // Skip check if email hasn't changed from initial (when editing)
            if (editingId && initialFormData && formData.email === initialFormData.email) {
                setEmailExists(true);
                return;
            }

            setIsCheckingEmail(true);
            try {
                const res = await fetch('/api/t-admin/users/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setEmailExists(data.exists);
                } else {
                    // On error, maybe assume true to avoid blocking? Or false?
                    // Let's assume false to be safe if user requested strict check
                    setEmailExists(false);
                }
            } catch (error) {
                setEmailExists(false);
            } finally {
                setIsCheckingEmail(false);
            }
        };

        const timer = setTimeout(() => {
            checkEmail();
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.email, editingId, initialFormData]);

    const resolveMessage = (key: string): string => t(key);

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, mode: 'create' | 'update' = 'create') => {
        e.preventDefault();
        setMessage(null);

        // Prevent update if no changes
        if (mode === 'update' && !isDirty()) {
            return;
        }

        // Prevent update if email doesn't exist (User Request)
        if (mode === 'update' && !emailExists) {
            setMessage({ type: 'error', text: 'tadmin.users.error.emailNotRegistered' });
            return;
        }

        // Validation
        if (
            !formData.email ||
            !formData.displayName ||
            !formData.lastName ||
            !formData.firstName ||
            !formData.lastNameKana ||
            !formData.firstNameKana ||
            !Array.isArray(formData.roleKeys) ||
            formData.roleKeys.length === 0
        ) {
            setMessage({ type: 'error', text: 'tadmin.users.error.validation' });
            return;
        }

        try {
            const url = '/api/t-admin/users';
            // Determine method based on mode. If mode is 'create', use POST. If 'update', use PUT.
            // Note: When 'create' is forced (Save as New), we use POST even if editingId exists.
            const isUpdate = mode === 'update';
            const method = isUpdate ? 'PUT' : 'POST';

            // 画面上では lastName を「性」、firstName を「名」として扱っているが、
            // 既存データとの互換性のため、API には従来の lastName/firstName 方向で送る。
            const apiPayload = {
                ...formData,
                lastName: formData.firstName,
                firstName: formData.lastName,
                lastNameKana: formData.firstNameKana,
                firstNameKana: formData.lastNameKana,
            };

            const body = isUpdate ? { ...apiPayload, userId: editingId } : apiPayload;

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await res.json();

            if (res.ok && result.ok) {
                setMessage({ type: 'success', text: isUpdate ? 'tadmin.users.update.success' : 'tadmin.users.create.success' });
                handleCancelEdit(); // Reset form and mode
                loadUsers();
            } else {
                const messageKey =
                    typeof result?.message === 'string' && result.message.startsWith('tadmin.')
                        ? result.message
                        : 'tadmin.users.error.internal';
                setMessage({ type: 'error', text: messageKey });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'tadmin.users.error.internal' });
        }
    };

    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const handleDeleteClick = (userId: string) => {
        setDeletingUserId(userId);
    };

    const handleCancelDelete = () => {
        setDeletingUserId(null);
    };

    const handleConfirmDelete = async () => {
        if (!deletingUserId) return;

        setMessage(null);

        try {
            const res = await fetch('/api/t-admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: deletingUserId, lang: currentLocale }),
            });

            const result = await res.json();
            if (res.ok && result.ok) {
                setMessage({ type: 'success', text: 'tadmin.users.delete.success' });
                loadUsers();
            } else {
                const messageKey =
                    typeof result?.message === 'string' && result.message.startsWith('tadmin.')
                        ? result.message
                        : 'tadmin.users.error.internal';
                setMessage({ type: 'error', text: messageKey });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'tadmin.users.error.internal' });
        } finally {
            setDeletingUserId(null);
        }
    };

    // --- Sorting State & Logic ---
    const [sortColumn, setSortColumn] = useState<keyof UserListItem | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (column: keyof UserListItem) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // --- Search & Pagination State & Logic ---
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSearchQuery, setActiveSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [showOnlyActive, setShowOnlyActive] = useState(true);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setActiveSearchQuery(searchQuery);
        setCurrentPage(1);
    };

    // Filter
    const filteredUsers = users.filter((user) => {
        // 無効ユーザを非表示にするフィルタ（チェックがオンのときのみ適用）
        if (showOnlyActive && user.status && user.status !== 'active') {
            return false;
        }

        if (!activeSearchQuery) return true;
        const q = activeSearchQuery.toLowerCase();

        // 検索は email / displayName / 姓名 / ふりがな / groupCode / residenceCode で実施
        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
        const fullNameKana = `${user.firstNameKana ?? ''} ${user.lastNameKana ?? ''}`.trim();

        return (
            user.email.toLowerCase().includes(q) ||
            user.displayName.toLowerCase().includes(q) ||
            fullName.toLowerCase().includes(q) ||
            fullNameKana.toLowerCase().includes(q) ||
            (user.groupCode && user.groupCode.toLowerCase().includes(q)) ||
            (user.residenceCode && user.residenceCode.toLowerCase().includes(q))
        );
    });

    // Sort
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortColumn) return 0;

        const getComparableValue = (user: UserListItem): string => {
            switch (sortColumn) {
                case 'email':
                case 'displayName':
                case 'lastName':
                case 'firstName':
                case 'lastNameKana':
                case 'firstNameKana':
                case 'groupCode':
                case 'residenceCode':
                case 'language':
                case 'status':
                    return (user[sortColumn] || '') as string;
                case 'roleKeys':
                    return user.roleKeys && user.roleKeys.length > 0 ? user.roleKeys.join(',') : '';
                case 'userId':
                default:
                    return '';
            }
        };

        const aVal = getComparableValue(a).toLowerCase();
        const bVal = getComparableValue(b).toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Paginate
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const paginatedUsers = sortedUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const renderSortIcon = (column: keyof UserListItem) => {
        const baseClass = 'ml-1 h-4 w-4';
        const colorClass = 'text-blue-600';

        return (
            <ChevronsUpDown
                aria-hidden="true"
                className={`${baseClass} ${colorClass}`}
                strokeWidth={2.4}
            />
        );
    };

    const SortableHeader = ({ column, label }: { column: keyof UserListItem; label: string }) => (
        <button
            type="button"
            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center">
                {label}
                {renderSortIcon(column)}
            </div>
        </button>
    );

    const emailLabel = resolveMessage('tadmin.users.form.email.label');
    const displayNameLabel = resolveMessage('tadmin.users.form.displayName.label');
    const lastNameLabel = resolveMessage('tadmin.users.form.lastName.label');
    const firstNameLabel = resolveMessage('tadmin.users.form.firstName.label');
    const lastNameKanaLabel = resolveMessage('tadmin.users.form.lastNameKana.label');
    const firstNameKanaLabel = resolveMessage('tadmin.users.form.firstNameKana.label');
    const groupCodeLabel = resolveMessage('tadmin.users.form.groupCode.label');
    const residenceCodeLabel = resolveMessage('tadmin.users.form.residenceCode.label');
    const roleLabelText = resolveMessage('tadmin.users.form.role.label');
    const roleGeneralUserLabel = resolveMessage('tadmin.users.form.role.general');
    const roleTenantAdminLabel = resolveMessage('tadmin.users.form.role.tenantAdmin');
    const roleGroupLeaderLabel = resolveMessage('tadmin.users.form.role.groupLeader');
    const languageLabel = resolveMessage('tadmin.users.form.language.label');
    const statusLabel = resolveMessage('tadmin.users.form.status.label');
    const statusActiveLabel = resolveMessage('tadmin.users.form.status.active');
    const statusInactiveLabel = resolveMessage('tadmin.users.form.status.inactive');

    const allRoleKeys: string[] = ['general_user', 'tenant_admin', 'group_leader'];

    const allGroupCodesForSelect = useMemo(() => {
        const set = new Set(groupOptions);
        if (formData.groupCode && !set.has(formData.groupCode)) {
            set.add(formData.groupCode);
        }
        return Array.from(set).sort();
    }, [groupOptions, formData.groupCode]);

    const allResidenceCodesForSelect = useMemo(() => {
        const set = new Set(residenceOptions);
        if (formData.residenceCode && !set.has(formData.residenceCode)) {
            set.add(formData.residenceCode);
        }
        return Array.from(set).sort();
    }, [residenceOptions, formData.residenceCode]);

    const roleLabelFromKey = (key: string): string => {
        if (key === 'tenant_admin') return roleTenantAdminLabel;
        if (key === 'group_leader') return roleGroupLeaderLabel;
        return roleGeneralUserLabel;
    };

    const availableRoleKeys = allRoleKeys.filter((key) => !formData.roleKeys.includes(key));

    const assignedRoleKeysForDisplay =
        formData.roleKeys && formData.roleKeys.length > 0 ? formData.roleKeys : ['general_user'];

    const handleAssignSelectedRoles = () => {
        setFormData((prev) => {
            const current = prev.roleKeys ?? [];
            const merged = [...current];
            selectedAvailableRoleKeys.forEach((key) => {
                if (!merged.includes(key)) {
                    merged.push(key);
                }
            });
            return { ...prev, roleKeys: merged };
        });
        setSelectedAvailableRoleKeys([]);
    };

    const handleAssignAllRoles = () => {
        setFormData((prev) => ({ ...prev, roleKeys: [...allRoleKeys] }));
        setSelectedAvailableRoleKeys([]);
    };

    const handleRemoveSelectedRoles = () => {
        setFormData((prev) => ({
            ...prev,
            roleKeys: prev.roleKeys.filter((key) => !selectedAssignedRoleKeys.includes(key)),
        }));
        setSelectedAssignedRoleKeys([]);
    };

    const handleRemoveAllRoles = () => {
        setFormData((prev) => ({ ...prev, roleKeys: [] }));
        setSelectedAssignedRoleKeys([]);
    };

    const saveNewButtonLabel = resolveMessage('tadmin.users.form.saveNew');
    const cancelButtonLabel = resolveMessage('tadmin.users.form.cancel');
    const submitUpdateButtonLabel = resolveMessage('tadmin.users.form.submit.update');
    const submitCreateButtonLabel = resolveMessage('tadmin.users.form.submit.create');

    const listTitleLabel = resolveMessage('tadmin.users.list.title');
    const searchPlaceholderLabel = resolveMessage('tadmin.users.search.placeholder');
    const searchButtonLabel = resolveMessage('tadmin.users.search.button');
    const clearButtonLabel = resolveMessage('tadmin.users.search.clear');
    const loadingLabel = resolveMessage('tadmin.users.list.loading');
    const emptyFilteredLabel = resolveMessage('tadmin.users.list.empty.filtered');
    const emptyNoDataLabel = resolveMessage('tadmin.users.list.empty.noData');

    const tableEmailHeaderLabel = resolveMessage('tadmin.users.table.email');
    const tableDisplayNameHeaderLabel = resolveMessage('tadmin.users.table.displayName');
    const tableFullNameHeaderLabel = resolveMessage('tadmin.users.table.fullName');
    const tableFullNameKanaHeaderLabel = resolveMessage('tadmin.users.table.fullNameKana');
    const tableGroupCodeHeaderLabel = resolveMessage('tadmin.users.table.groupCode');
    const tableResidenceCodeHeaderLabel = resolveMessage('tadmin.users.table.residenceCode');
    const tableLanguageHeaderLabel = resolveMessage('tadmin.users.table.language');
    const tableStatusHeaderLabel = resolveMessage('tadmin.users.table.status');
    const tableRoleHeaderLabel = resolveMessage('tadmin.users.table.role');
    const tableActionsHeaderLabel = resolveMessage('tadmin.users.table.actions');

    const actionEditLabel = resolveMessage('tadmin.users.actions.edit');
    const actionDeleteLabel = resolveMessage('tadmin.users.actions.delete');

    const paginationPerPageLabel = resolveMessage('tadmin.users.pagination.perPage.label');
    const paginationRangeMiddleLabel = resolveMessage('tadmin.users.pagination.range.middle');
    const paginationRangeSuffixLabel = resolveMessage('tadmin.users.pagination.range.suffix');
    const paginationPrevLabel = resolveMessage('tadmin.users.pagination.prev');
    const paginationNextLabel = resolveMessage('tadmin.users.pagination.next');

    const filterActiveOnlyLabel = resolveMessage('tadmin.users.filter.activeOnly');
    const deleteCancelButtonLabel = resolveMessage('tadmin.users.delete.cancel');
    const deleteSubmitButtonLabel = resolveMessage('tadmin.users.delete.submit');
    const deleteConfirmMessage = resolveMessage('tadmin.users.delete.confirm');

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-6">
            <div className="space-y-4">
                {tenantName && (
                    <div className="mb-1 flex justify-center">
                        <p className="max-w-full truncate text-base font-medium text-gray-600">
                            {tenantName}
                        </p>
                    </div>
                )}

                {/* SEC-01: ヘッダ (削除済み) */}

                {/* メッセージ表示 */}
                {message && (
                    <div
                        className={`rounded-lg border px-4 py-2 text-sm ${message.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                    >
                        {message.text.startsWith('tadmin.')
                            ? resolveMessage(message.text)
                            : message.text}
                    </div>
                )}

                {/* SEC-02: ユーザ登録フォーム */}
                <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">

                    <form onSubmit={(e) => handleSubmit(e, editingId ? 'update' : 'create')} className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                                <label htmlFor="email" className="block text-xs font-medium text-gray-700">
                                    {emailLabel} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="displayName" className="block text-xs font-medium text-gray-700">
                                    {displayNameLabel} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="displayName"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="language" className="block text-xs font-medium text-gray-700">
                                    {languageLabel}
                                </label>
                                <select
                                    id="language"
                                    value={formData.language}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="ja">JA</option>
                                    <option value="en">EN</option>
                                    <option value="zh">CN</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-xs font-medium text-gray-700">
                                    {lastNameLabel} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="firstName" className="block text-xs font-medium text-gray-700">
                                    {firstNameLabel} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="residenceCode" className="block text-xs font-medium text-gray-700">
                                    {residenceCodeLabel}
                                </label>
                                <select
                                    id="residenceCode"
                                    value={formData.residenceCode}
                                    onChange={(e) => setFormData({ ...formData, residenceCode: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">
                                        {resolveMessage('tadmin.users.form.groupCode.none')}
                                    </option>
                                    {allResidenceCodesForSelect.map((code) => (
                                        <option key={code} value={code}>
                                            {code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="lastNameKana" className="block text-xs font-medium text-gray-700">
                                    {lastNameKanaLabel} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="lastNameKana"
                                    value={formData.lastNameKana}
                                    onChange={(e) => setFormData({ ...formData, lastNameKana: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="firstNameKana" className="block text-xs font-medium text-gray-700">
                                    {firstNameKanaLabel} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="firstNameKana"
                                    value={formData.firstNameKana}
                                    onChange={(e) => setFormData({ ...formData, firstNameKana: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="groupCode" className="block text-xs font-medium text-gray-700">
                                    {groupCodeLabel}
                                </label>
                                <select
                                    id="groupCode"
                                    value={formData.groupCode}
                                    onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">
                                        {resolveMessage('tadmin.users.form.groupCode.none')}
                                    </option>
                                    {allGroupCodesForSelect.map((code) => (
                                        <option key={code} value={code}>
                                            {code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="status" className="block text-xs font-medium text-gray-700">
                                    {statusLabel}
                                </label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value as 'active' | 'inactive',
                                        })
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="active">{statusActiveLabel}</option>
                                    <option value="inactive">{statusInactiveLabel}</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-col md:flex-row md:items-start md:space-x-2">
                            {/* 未割り当てロール一覧 */}
                            <div>
                                <div className="mb-0 text-[11px] font-semibold text-gray-600">
                                    {resolveMessage('tadmin.users.form.role.available')}
                                </div>
                                <select
                                    multiple
                                    className="h-32 w-full md:w-40 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={selectedAvailableRoleKeys}
                                    onChange={(e) =>
                                        setSelectedAvailableRoleKeys(
                                            Array.from(e.target.selectedOptions).map((opt) => opt.value),
                                        )
                                    }
                                >
                                    {availableRoleKeys.map((key) => (
                                        <option key={key} value={key}>
                                            {roleLabelFromKey(key)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 矢印ボタン */}
                            <div className="mt-3 flex h-32 flex-row items-center justify-center space-x-2 md:mt-5 md:flex-col md:space-x-0 md:space-y-2">
                                <button
                                    type="button"
                                    onClick={handleAssignSelectedRoles}
                                    className="w-12 rounded border border-gray-300 bg-white py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    &gt;
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAssignAllRoles}
                                    className="w-12 rounded border border-gray-300 bg-white py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    &gt;&gt;
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveSelectedRoles}
                                    className="w-12 rounded border border-gray-300 bg-white py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    &lt;
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveAllRoles}
                                    className="w-12 rounded border border-gray-300 bg-white py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    &lt;&lt;
                                </button>
                            </div>

                            {/* 割り当て済みロール一覧 */}
                            <div className="mt-3 md:mt-0">
                                <div className="mb-0 text-[11px] font-semibold text-gray-600">
                                    {resolveMessage('tadmin.users.form.role.assigned')}
                                </div>
                                <select
                                    multiple
                                    className="h-32 w-full md:w-40 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={selectedAssignedRoleKeys}
                                    onChange={(e) =>
                                        setSelectedAssignedRoleKeys(
                                            Array.from(e.target.selectedOptions).map((opt) => opt.value),
                                        )
                                    }
                                >
                                    {assignedRoleKeysForDisplay.map((key) => (
                                        <option key={key} value={key}>
                                            {roleLabelFromKey(key)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2">
                            <div>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleSubmit(e, 'create')}
                                        disabled={emailExists || isCheckingEmail}
                                        className={`rounded-lg border-2 px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${emailExists || isCheckingEmail
                                            ? 'border-gray-300 text-gray-400 cursor-not-allowed bg-white'
                                            : 'border-blue-400 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-300'
                                            }`}
                                    >
                                        {saveNewButtonLabel}
                                    </button>
                                )}
                            </div>
                            <div className="flex space-x-3">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
                                    >
                                        {cancelButtonLabel}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    onClick={(e) => handleSubmit(e, editingId ? 'update' : 'create')}
                                    disabled={editingId ? (!emailExists || isCheckingEmail || !isDirty()) : false}
                                    className={`rounded-lg border-2 px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${editingId
                                        ? (emailExists && !isCheckingEmail && isDirty())
                                            ? 'border-green-500 text-green-600 hover:bg-green-50 focus:ring-green-400'
                                            : 'border-gray-300 text-gray-400 cursor-not-allowed'
                                        : 'border-blue-400 text-blue-600 hover:bg-blue-50 focus:ring-blue-300'
                                        }`}
                                >
                                    {editingId ? submitUpdateButtonLabel : submitCreateButtonLabel}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>

                {/* SEC-03: ユーザ一覧テーブル */}
                <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-3 md:space-y-0">
                        <h2 className="text-sm font-bold text-gray-900">{listTitleLabel}</h2>

                        {/* 検索フォーム＋ステータスフィルタ */}
                        <form onSubmit={handleSearch} className="flex w-full md:w-auto items-center space-x-2">
                            <label className="flex items-center text-[11px] text-gray-600 mr-1 -ml-6">
                                <span className="mr-1 whitespace-nowrap">{filterActiveOnlyLabel}</span>
                                <input
                                    type="checkbox"
                                    checked={showOnlyActive}
                                    onChange={(e) => {
                                        setShowOnlyActive(e.target.checked);
                                        setCurrentPage(1);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <input
                                    type="checkbox"
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    className="h-4 w-4 opacity-0 pointer-events-none"
                                />
                            </label>
                            <input
                                type="text"
                                placeholder={searchPlaceholderLabel}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 md:w-72 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="rounded-md border-2 border-blue-400 bg-white px-4 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                            >
                                {searchButtonLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveSearchQuery('');
                                    setCurrentPage(1);
                                }}
                                disabled={!searchQuery && !activeSearchQuery}
                                className={`rounded-md border-2 px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${!searchQuery && !activeSearchQuery
                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 focus:ring-gray-500'
                                    }`}
                            >
                                {clearButtonLabel}
                            </button>
                        </form>
                    </div>

                    {loading ? (
                        <p className="text-sm text-gray-500">{loadingLabel}</p>
                    ) : sortedUsers.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            {activeSearchQuery ? emptyFilteredLabel : emptyNoDataLabel}
                        </p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="w-44">
                                                <SortableHeader column="email" label={tableEmailHeaderLabel} />
                                            </th>
                                            <th className="w-28">
                                                <SortableHeader column="displayName" label={tableDisplayNameHeaderLabel} />
                                            </th>
                                            <th className="w-32">
                                                <SortableHeader column="lastName" label={tableFullNameHeaderLabel} />
                                            </th>
                                            <th className="w-40">
                                                <SortableHeader column="lastNameKana" label={tableFullNameKanaHeaderLabel} />
                                            </th>
                                            <th className="w-24 text-center">
                                                <SortableHeader column="groupCode" label={tableGroupCodeHeaderLabel} />
                                            </th>
                                            <th className="w-20 text-center">
                                                <SortableHeader column="residenceCode" label={tableResidenceCodeHeaderLabel} />
                                            </th>
                                            <th className="w-16 text-center">
                                                <SortableHeader column="language" label={tableLanguageHeaderLabel} />
                                            </th>
                                            <th className="w-28 text-center">
                                                <SortableHeader column="roleKeys" label={tableRoleHeaderLabel} />
                                            </th>
                                            <th className="w-20 text-center">
                                                <SortableHeader column="status" label={tableStatusHeaderLabel} />
                                            </th>
                                            <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap w-40">{tableActionsHeaderLabel}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedUsers.map((user) => {
                                            const languageShortLabel =
                                                user.language === 'en' ? 'EN' : user.language === 'zh' ? 'CN' : 'JA';

                                            const isDisabled = user.status && user.status !== 'active';
                                            const mainTextClass = isDisabled ? 'text-red-600' : 'text-gray-900';
                                            const subTextClass = isDisabled ? 'text-red-500' : 'text-gray-600';

                                            const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
                                            const fullNameKana = `${user.firstNameKana ?? ''} ${user.lastNameKana ?? ''}`.trim();

                                            const rolesForDisplay = (user.roleKeys && user.roleKeys.length > 0
                                                ? user.roleKeys
                                                : ['general_user'])
                                                .map((key) => {
                                                    if (key === 'tenant_admin') return roleTenantAdminLabel;
                                                    if (key === 'group_leader') return roleGroupLeaderLabel;
                                                    return roleGeneralUserLabel;
                                                })
                                                .join(' / ');

                                            return (
                                                <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className={`px-3 py-2 text-xs ${mainTextClass} max-w-[11rem] truncate`} title={user.email}>{user.email}</td>
                                                    <td className={`px-3 py-2 text-xs ${mainTextClass} max-w-[8rem] truncate`} title={user.displayName}>{user.displayName}</td>
                                                    <td className={`px-3 py-2 text-xs ${mainTextClass} max-w-[8rem] truncate`} title={fullName}>{fullName}</td>
                                                    <td className={`px-3 py-2 text-xs ${subTextClass} max-w-[10rem] truncate`} title={fullNameKana}>{fullNameKana}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{user.groupCode || '-'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{user.residenceCode || '-'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{languageShortLabel}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{rolesForDisplay}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">
                                                        {user.status === 'inactive' ? statusInactiveLabel : statusActiveLabel}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                                                        <div className="flex space-x-2 justify-center">
                                                            <button
                                                                onClick={() => handleEdit(user)}
                                                                className="rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                                                            >
                                                                {actionEditLabel}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(user.userId)}
                                                                className="rounded-lg border-2 border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                                            >
                                                                {actionDeleteLabel}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ページネーション */}
                            <div className="mt-4 flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <span>{paginationPerPageLabel}</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="rounded border border-gray-300 py-1 px-2 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span>
                                        {sortedUsers.length} {paginationRangeMiddleLabel} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedUsers.length)} {paginationRangeSuffixLabel}
                                    </span>
                                </div>

                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1 rounded-md border-2 text-sm transition-colors ${currentPage === 1
                                            ? 'border-gray-200 bg-white text-gray-300 cursor-not-allowed'
                                            : 'border-blue-400 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-500'
                                            }`}
                                    >
                                        {paginationPrevLabel}
                                    </button>
                                    {/* 簡易的なページ番号表示 (必要に応じて拡張) */}
                                    <span className="px-3 py-1 text-sm text-gray-700">
                                        {currentPage} / {totalPages || 1}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className={`px-3 py-1 rounded-md border-2 text-sm transition-colors ${currentPage === totalPages || totalPages === 0
                                            ? 'border-gray-200 bg-white text-gray-300 cursor-not-allowed'
                                            : 'border-blue-400 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-500'
                                            }`}
                                    >
                                        {paginationNextLabel}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {/* Delete Confirmation Modal */}
            {deletingUserId && (
                <div
                    className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent"
                    onClick={handleCancelDelete}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border-2 border-red-500 bg-white/90 p-4 text-sm text-gray-700 shadow-lg"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2 text-red-600">
                                <TriangleAlert className="h-5 w-5" strokeWidth={2.5} />
                                <span className="text-lg font-bold text-gray-900">
                                    {users.find(u => u.userId === deletingUserId)?.email}
                                </span>
                            </div>
                            <p className="whitespace-pre-line">
                                {deleteConfirmMessage}
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
                            >
                                {deleteCancelButtonLabel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                                {deleteSubmitButtonLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

TenantAdminUserManagement.displayName = 'TenantAdminUserManagement';

