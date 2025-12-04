"use client";

import React, { useState, useEffect } from 'react';
import { ChevronsUpDown, TriangleAlert } from 'lucide-react';
import { useI18n } from '@/src/components/common/StaticI18nProvider';
import type { TenantAdminUserManagementProps, UserListItem, UserFormData } from './TenantAdminUserManagement.types';

export const TenantAdminUserManagement: React.FC<TenantAdminUserManagementProps> = ({ tenantId, tenantName }) => {
    const { t } = useI18n();
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState<UserFormData>({
        email: '',
        fullName: '',
        fullNameKana: '',
        displayName: '',
        groupCode: '',
        residenceCode: '',
        roleKey: 'general_user',
        language: 'ja',
    });

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/t-admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                setMessage({ type: 'error', text: t('tadmin.users.error.internal') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('tadmin.users.error.internal') });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const [initialFormData, setInitialFormData] = useState<UserFormData | null>(null);

    const handleEdit = (user: UserListItem) => {
        setEditingId(user.userId);
        const newFormData: UserFormData = {
            email: user.email,
            fullName: user.fullName,
            fullNameKana: user.fullNameKana,
            displayName: user.displayName,
            groupCode: user.groupCode || '',
            residenceCode: user.residenceCode || '',
            roleKey: user.roleKey,
            language: user.language,
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
            fullName: '',
            fullNameKana: '',
            displayName: '',
            groupCode: '',
            residenceCode: '',
            roleKey: 'general_user',
            language: 'ja',
        });
        setMessage(null);
    };

    const isDirty = () => {
        if (!initialFormData) return true; // Not editing or just started
        return (
            formData.email !== initialFormData.email ||
            formData.displayName !== initialFormData.displayName ||
            formData.fullName !== initialFormData.fullName ||
            formData.fullNameKana !== initialFormData.fullNameKana ||
            formData.groupCode !== initialFormData.groupCode ||
            formData.residenceCode !== initialFormData.residenceCode ||
            formData.roleKey !== initialFormData.roleKey ||
            formData.language !== initialFormData.language
        );
    };

    const [emailExists, setEmailExists] = useState(true);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, mode: 'create' | 'update' = 'create') => {
        e.preventDefault();
        setMessage(null);

        // Prevent update if no changes
        if (mode === 'update' && !isDirty()) {
            return;
        }

        // Prevent update if email doesn't exist (User Request)
        if (mode === 'update' && !emailExists) {
            setMessage({ type: 'error', text: '入力されたメールアドレスは登録されていません。' });
            return;
        }

        // Validation
        if (!formData.email || !formData.fullName || !formData.fullNameKana || !formData.displayName || !formData.roleKey) {
            setMessage({ type: 'error', text: t('tadmin.users.error.validation') });
            return;
        }

        try {
            const url = '/api/t-admin/users';
            // Determine method based on mode. If mode is 'create', use POST. If 'update', use PUT.
            // Note: When 'create' is forced (Save as New), we use POST even if editingId exists.
            const isUpdate = mode === 'update';
            const method = isUpdate ? 'PUT' : 'POST';
            const body = isUpdate ? { ...formData, userId: editingId } : formData;

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await res.json();

            if (res.ok && result.ok) {
                setMessage({ type: 'success', text: isUpdate ? t('tadmin.users.update.success') : t('tadmin.users.create.success') });
                handleCancelEdit(); // Reset form and mode
                loadUsers();
            } else {
                setMessage({ type: 'error', text: result.message || t('tadmin.users.error.internal') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('tadmin.users.error.internal') });
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
                body: JSON.stringify({ userId: deletingUserId }),
            });

            const result = await res.json();
            if (res.ok && result.ok) {
                setMessage({ type: 'success', text: t('tadmin.users.delete.success') });
                loadUsers();
            } else {
                setMessage({ type: 'error', text: result.message || t('tadmin.users.error.internal') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('tadmin.users.error.internal') });
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

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setActiveSearchQuery(searchQuery);
        setCurrentPage(1);
    };

    // Filter
    const filteredUsers = users.filter(user => {
        if (!activeSearchQuery) return true;
        const q = activeSearchQuery.toLowerCase();

        const roleLabel = user.roleKey === 'tenant_admin' ? 'テナント管理者' : '一般ユーザ';

        return (
            user.email.toLowerCase().includes(q) ||
            user.displayName.toLowerCase().includes(q) ||
            user.fullName.toLowerCase().includes(q) ||
            (user.fullNameKana && user.fullNameKana.toLowerCase().includes(q)) ||
            (user.groupCode && user.groupCode.toLowerCase().includes(q)) ||
            (user.residenceCode && user.residenceCode.toLowerCase().includes(q)) ||
            roleLabel.includes(q)
        );
    });

    // Sort
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortColumn) return 0;
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';

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
                        {message.text}
                    </div>
                )}

                {/* SEC-02: ユーザ登録フォーム */}
                <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">

                    <form onSubmit={(e) => handleSubmit(e, editingId ? 'update' : 'create')} className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <label htmlFor="email" className="block text-xs font-medium text-gray-700">
                                    メールアドレス <span className="text-red-500">*</span>
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
                                    ニックネーム <span className="text-red-500">*</span>
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
                                <label htmlFor="fullName" className="block text-xs font-medium text-gray-700">
                                    氏名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="fullNameKana" className="block text-xs font-medium text-gray-700">
                                    ふりがな <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="fullNameKana"
                                    value={formData.fullNameKana}
                                    onChange={(e) => setFormData({ ...formData, fullNameKana: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="groupCode" className="block text-xs font-medium text-gray-700">
                                    グループID
                                </label>
                                <input
                                    type="text"
                                    id="groupCode"
                                    value={formData.groupCode}
                                    onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="residenceCode" className="block text-xs font-medium text-gray-700">
                                    住居番号
                                </label>
                                <input
                                    type="text"
                                    id="residenceCode"
                                    value={formData.residenceCode}
                                    onChange={(e) => setFormData({ ...formData, residenceCode: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="roleKey" className="block text-xs font-medium text-gray-700">
                                    ロール <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="roleKey"
                                    value={formData.roleKey}
                                    onChange={(e) => setFormData({ ...formData, roleKey: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                >
                                    <option value="general_user">一般ユーザ</option>
                                    <option value="tenant_admin">テナント管理者</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="language" className="block text-xs font-medium text-gray-700">
                                    言語
                                </label>
                                <select
                                    id="language"
                                    value={formData.language}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="ja">JA</option>
                                    <option value="en">EN</option>
                                    <option value="zh">ZH</option>
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
                                        新規登録
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
                                        キャンセル
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
                                    {editingId ? '更新' : 'ユーザ登録'}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>

                {/* SEC-03: ユーザ一覧テーブル */}
                <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-3 md:space-y-0">
                        <h2 className="text-sm font-bold text-gray-900">ユーザ一覧</h2>

                        {/* 検索フォーム */}
                        <form onSubmit={handleSearch} className="flex w-full md:w-auto space-x-2">
                            <input
                                type="text"
                                placeholder="検索キーワード..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 md:w-96 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="rounded-md border-2 border-blue-400 bg-white px-4 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                            >
                                検索
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
                                クリア
                            </button>
                        </form>
                    </div>

                    {loading ? (
                        <p className="text-sm text-gray-500">読み込み中...</p>
                    ) : sortedUsers.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            {activeSearchQuery ? '検索条件に一致するユーザは見つかりませんでした。' : 'ユーザが登録されていません。'}
                        </p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="w-44">
                                                <SortableHeader column="email" label="メールアドレス" />
                                            </th>
                                            <th className="w-28">
                                                <SortableHeader column="displayName" label="ニックネーム" />
                                            </th>
                                            <th className="w-32">
                                                <SortableHeader column="fullName" label="氏名" />
                                            </th>
                                            <th className="w-40">
                                                <SortableHeader column="fullNameKana" label="ふりがな" />
                                            </th>
                                            <th className="w-24 text-center">
                                                <SortableHeader column="groupCode" label="グループID" />
                                            </th>
                                            <th className="w-20 text-center">
                                                <SortableHeader column="residenceCode" label="住居番号" />
                                            </th>
                                            <th className="w-16 text-center">
                                                <SortableHeader column="language" label="言語" />
                                            </th>
                                            <th className="w-28 text-center">
                                                <SortableHeader column="roleKey" label="ロール" />
                                            </th>
                                            <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap w-40">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedUsers.map((user) => {
                                            const languageLabel =
                                                user.language === 'en' ? 'EN' : user.language === 'zh' ? 'ZH' : 'JA';

                                            return (
                                                <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-3 py-2 text-xs text-gray-900 max-w-[11rem] truncate" title={user.email}>{user.email}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-900 max-w-[8rem] truncate" title={user.displayName}>{user.displayName}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-900 max-w-[8rem] truncate" title={user.fullName}>{user.fullName}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[10rem] truncate" title={user.fullNameKana}>{user.fullNameKana}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{user.groupCode || '-'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{user.residenceCode || '-'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{languageLabel}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">
                                                        {user.roleKey === 'tenant_admin' ? 'テナント管理者' : '一般ユーザ'}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                                                        <div className="flex space-x-2 justify-center">
                                                            <button
                                                                onClick={() => handleEdit(user)}
                                                                className="rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                                                            >
                                                                編集
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(user.userId)}
                                                                className="rounded-lg border-2 border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                                            >
                                                                削除
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
                                    <span>表示件数:</span>
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
                                        {sortedUsers.length} 件中 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedUsers.length)} 件を表示
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
                                        前へ
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
                                        次へ
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
                                {t('tadmin.users.delete.confirm')}
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

TenantAdminUserManagement.displayName = 'TenantAdminUserManagement';

