"use client";

import React, { useState, useEffect } from 'react';
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

    const handleEdit = (user: UserListItem) => {
        setEditingId(user.userId);
        setFormData({
            email: user.email,
            fullName: user.fullName,
            fullNameKana: user.fullNameKana,
            displayName: user.displayName,
            groupCode: user.groupCode || '',
            residenceCode: user.residenceCode || '',
            roleKey: user.roleKey,
            language: user.language,
        });
        setMessage(null);
        // Scroll to top to show form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (!formData.email || !formData.fullName || !formData.fullNameKana || !formData.displayName || !formData.roleKey) {
            setMessage({ type: 'error', text: t('tadmin.users.error.validation') });
            return;
        }

        try {
            const url = '/api/t-admin/users';
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId ? { ...formData, userId: editingId } : formData;

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await res.json();

            if (res.ok && result.ok) {
                setMessage({ type: 'success', text: editingId ? t('tadmin.users.update.success') : t('tadmin.users.create.success') });
                handleCancelEdit(); // Reset form and mode
                loadUsers();
            } else {
                setMessage({ type: 'error', text: result.message || t('tadmin.users.error.internal') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('tadmin.users.error.internal') });
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm(t('tadmin.users.delete.confirm'))) {
            return;
        }

        setMessage(null);

        try {
            const res = await fetch('/api/t-admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
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
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-6">
            <div className="space-y-4">
                {/* SEC-01: ヘッダ */}
                <section>
                    <p className="text-sm font-bold text-gray-700">テナント名: {tenantName}</p>
                </section>

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

                    <form onSubmit={handleSubmit} className="space-y-3">
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
                                    <option value="ja">日本語</option>
                                    <option value="en">English</option>
                                    <option value="zh">中文</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
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
                                className={`rounded-lg border-2 px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${editingId
                                    ? 'border-green-500 text-green-600 hover:bg-green-50 focus:ring-green-400'
                                    : 'border-blue-400 text-blue-600 hover:bg-blue-50 focus:ring-blue-300'
                                    }`}
                            >
                                {editingId ? '更新' : 'ユーザ登録'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* SEC-03: ユーザ一覧テーブル */}
                <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-bold text-gray-900">ユーザ一覧</h2>
                    {loading ? (
                        <p className="text-sm text-gray-500">読み込み中...</p>
                    ) : users.length === 0 ? (
                        <p className="text-sm text-gray-500">ユーザが登録されていません。</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">メールアドレス</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">ニックネーム</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">氏名</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">ふりがな</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">グループID</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">住居番号</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">ロール</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2 text-xs text-gray-900">{user.email}</td>
                                            <td className="px-3 py-2 text-xs text-gray-900">{user.displayName}</td>
                                            <td className="px-3 py-2 text-xs text-gray-900">{user.fullName}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">{user.fullNameKana}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">{user.groupCode || '-'}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">{user.residenceCode || '-'}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">
                                                {user.roleKey === 'tenant_admin' ? 'テナント管理者' : '一般ユーザ'}
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.userId)}
                                                        className="rounded-lg border-2 border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

TenantAdminUserManagement.displayName = 'TenantAdminUserManagement';
