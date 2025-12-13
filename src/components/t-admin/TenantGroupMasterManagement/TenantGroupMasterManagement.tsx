"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { TriangleAlert, ChevronsUpDown } from 'lucide-react';
import { useI18n, useTenantStaticTranslations } from '@/src/components/common/StaticI18nProvider';
import type { TenantGroupItem, TenantGroupMasterManagementProps } from './TenantGroupMasterManagement.types';

export const TenantGroupMasterManagement: React.FC<TenantGroupMasterManagementProps> = ({ tenantName, tenantId }) => {
  const { t } = useI18n();
  useTenantStaticTranslations({ tenantId, apiPath: 't-admin-groups' });
  useTenantStaticTranslations({ tenantId, apiPath: 't-admin-users' });
  const [groups, setGroups] = useState<TenantGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<TenantGroupItem | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ group: TenantGroupItem; newCode: string } | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const loadGroups = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/t-admin/groups');
      if (!res.ok) {
        setMessage({ type: 'error', text: 'tadmin.groups.error.listFailed' });
        setGroups([]);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        items?: TenantGroupItem[];
        message?: string;
      };

      if (!data.ok || !Array.isArray(data.items)) {
        setMessage({ type: 'error', text: 'tadmin.groups.error.listFailed' });
        setGroups([]);
        return;
      }

      setGroups(data.items);
    } catch {
      setMessage({ type: 'error', text: 'tadmin.groups.error.listFailed' });
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  const resolveMessage = (key: string): string => t(key);

  const handleEditClick = (item: TenantGroupItem) => {
    setEditingGroupId(item.id);
    setInputValue(item.groupCode);
    setMessage(null);
  };

  const handleClearSelection = () => {
    setEditingGroupId(null);
    setInputValue('');
    setMessage(null);
  };

  const handleRegister = async () => {
    if (!inputValue.trim()) {
      setMessage({ type: 'error', text: 'tadmin.groups.error.groupIdRequired' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/t-admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupCode: inputValue.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        const messageKey =
          typeof data?.message === 'string' && data.message.startsWith('tadmin.')
            ? data.message
            : 'tadmin.groups.error.registerFailed';
        setMessage({ type: 'error', text: messageKey });
        return;
      }

      setMessage({ type: 'success', text: 'tadmin.groups.success.registered' });
      setInputValue('');
      setEditingGroupId(null);
      void loadGroups();
    } catch {
      setMessage({ type: 'error', text: 'tadmin.groups.error.registerFailed' });
    } finally {
      setSubmitting(false);
    }
  };

  const performUpdate = async (groupId: string, newCode: string) => {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/t-admin/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, groupCode: newCode }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        const messageKey =
          typeof data?.message === 'string' && data.message.startsWith('tadmin.')
            ? data.message
            : 'tadmin.groups.error.updateFailed';
        setMessage({ type: 'error', text: messageKey });
        return;
      }

      setMessage({ type: 'success', text: 'tadmin.groups.success.updated' });
      void loadGroups();
    } catch {
      setMessage({ type: 'error', text: 'tadmin.groups.error.updateFailed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClick = () => {
    if (!editingGroupId) {
      setMessage({ type: 'error', text: 'tadmin.groups.error.updateTargetNotSelected' });
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'tadmin.groups.error.groupIdRequired' });
      return;
    }

    const target = groups.find((g) => g.id === editingGroupId) || null;
    if (!target) {
      setMessage({ type: 'error', text: 'tadmin.groups.error.updateTargetMissing' });
      return;
    }

    setPendingUpdate({ group: target, newCode: trimmed });
  };

  const performDelete = async (groupId: string) => {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/t-admin/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; errorCode?: string };

      if (!res.ok || !data.ok) {
        const messageKey =
          typeof data?.message === 'string' && data.message.startsWith('tadmin.')
            ? data.message
            : 'tadmin.groups.error.deleteFailed';
        setMessage({ type: 'error', text: messageKey });
        return;
      }

      setMessage({ type: 'success', text: 'tadmin.groups.success.deleted' });
      if (editingGroupId === groupId) {
        setEditingGroupId(null);
        setInputValue('');
      }
      void loadGroups();
    } catch {
      setMessage({ type: 'error', text: 'tadmin.groups.error.deleteFailed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowDelete = async (item: TenantGroupItem) => {
    setDeletingGroup(item);
  };

  const handleCancelDelete = () => {
    setDeletingGroup(null);
  };

  const handleCancelUpdate = () => {
    setPendingUpdate(null);
  };

  const handleConfirmUpdate = async () => {
    if (!pendingUpdate) return;
    await performUpdate(pendingUpdate.group.id, pendingUpdate.newCode);
    setPendingUpdate(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;
    const targetId = deletingGroup.id;
    await performDelete(targetId);
    setDeletingGroup(null);
  };

  const sortedGroups = useMemo(() => {
    const copied = [...groups];
    copied.sort((a, b) => {
      const av = a.groupCode ?? '';
      const bv = b.groupCode ?? '';
      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copied;
  }, [groups, sortDirection]);

  const totalPages = sortedGroups.length === 0 ? 1 : Math.ceil(sortedGroups.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedGroups.slice(start, end);
  }, [sortedGroups, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, sortDirection, groups.length]);

  const paginationPerPageLabel = resolveMessage('tadmin.users.pagination.perPage.label');
  const paginationRangeMiddleLabel = resolveMessage('tadmin.users.pagination.range.middle');
  const paginationRangeSuffixLabel = resolveMessage('tadmin.users.pagination.range.suffix');
  const paginationPrevLabel = resolveMessage('tadmin.users.pagination.prev');
  const paginationNextLabel = resolveMessage('tadmin.users.pagination.next');

  const groupIdLabel = resolveMessage('tadmin.groups.form.groupId.label');
  const registerButtonLabel = resolveMessage('tadmin.groups.form.registerButton');
  const updateButtonLabel = resolveMessage('tadmin.groups.form.updateButton');
  const groupListTitleLabel = resolveMessage('tadmin.groups.list.title');
  const tableGroupIdHeaderLabel = resolveMessage('tadmin.groups.table.groupId');
  const tableActionsHeaderLabel = resolveMessage('tadmin.groups.table.actions');
  const loadingLabel = resolveMessage('tadmin.groups.list.loading');
  const emptyLabel = resolveMessage('tadmin.groups.list.empty');
  const actionEditLabel = resolveMessage('tadmin.users.actions.edit');
  const actionDeleteLabel = resolveMessage('tadmin.users.actions.delete');
  const clearSelectionLabel = resolveMessage('tadmin.groups.actions.clearSelection');
  const updateConfirmMessage = resolveMessage('tadmin.groups.modal.update.confirm');
  const deleteConfirmMessage = resolveMessage('tadmin.groups.modal.delete.confirm');
  const cancelButtonLabel = resolveMessage('tadmin.groups.modal.cancel');
  const confirmUpdateButtonLabel = resolveMessage('tadmin.groups.modal.confirmUpdate');
  const confirmDeleteButtonLabel = resolveMessage('tadmin.groups.modal.confirmDelete');

  const handleToggleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="w-full max-w-[550px] mx-auto px-4 py-6">
      <div className="space-y-4">
        {tenantName && (
          <div className="mb-1 flex justify-center">
            <p className="max-w-full truncate text-base font-medium text-gray-600">{tenantName}</p>
          </div>
        )}

        {message && (
          <div
            className={`rounded-lg border px-4 py-2 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text.startsWith('tadmin.') ? resolveMessage(message.text) : message.text}
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div
            className="mb-4 grid items-end gap-3"
            style={{ gridTemplateColumns: '18ch 1.5rem minmax(0, 1fr)' }}
          >
            <div className="flex-shrink-0">
              <label htmlFor="groupId" className="block text-xs font-medium text-gray-700">
                {groupIdLabel}
              </label>
              <input
                id="groupId"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                size={18}
                className="mt-1 block rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            <div />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleRegister}
                disabled={submitting}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {registerButtonLabel}
              </button>

              <button
                type="button"
                onClick={handleUpdateClick}
                disabled={submitting}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-emerald-500 bg-white px-4 py-2 text-sm font-medium text-emerald-600 shadow-sm hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updateButtonLabel}
              </button>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">{groupListTitleLabel}</h2>
            {editingGroupId && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-blue-600 hover:underline"
              >
                {clearSelectionLabel}
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-700"
                    style={{ width: '18ch' }}
                  >
                    <button
                      type="button"
                      onClick={handleToggleSort}
                      className="inline-flex items-center text-xs font-semibold text-gray-700 hover:text-blue-600"
                    >
                      <span>{tableGroupIdHeaderLabel}</span>
                      <ChevronsUpDown className="ml-1 h-4 w-4 text-blue-600" strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-4 py-2 w-40 text-left text-xs font-semibold text-gray-700">{tableActionsHeaderLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-sm text-gray-500">
                      {loadingLabel}
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-sm text-gray-500">
                      {emptyLabel}
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((item) => {
                    const isEditing = item.id === editingGroupId;
                    return (
                      <tr key={item.id} className={isEditing ? 'bg-blue-50/40' : undefined}>
                        <td
                          className="px-4 py-2 text-sm text-gray-800"
                          style={{ width: '18ch' }}
                        >
                          {item.groupCode}
                        </td>
                        <td className="px-4 py-2 w-40 text-sm">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditClick(item)}
                              className="rounded-md border border-blue-500 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                            >
                              {actionEditLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRowDelete(item)}
                              className="rounded-md border border-red-400 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 whitespace-nowrap"
                            >
                              {actionDeleteLabel}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col items-center justify-between space-y-3 text-sm text-gray-600 md:flex-row md:space-y-0">
            <div className="flex items-center space-x-2">
              <span>{paginationPerPageLabel}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                }}
                className="rounded border border-gray-300 py-1 px-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                {sortedGroups.length} {paginationRangeMiddleLabel}{' '}
                {sortedGroups.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -
                {' '}
                {Math.min(currentPage * itemsPerPage, sortedGroups.length)} {paginationRangeSuffixLabel}
              </span>
            </div>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || sortedGroups.length === 0}
                className={`px-3 py-1 rounded-md border-2 text-sm transition-colors ${
                  currentPage === 1 || sortedGroups.length === 0
                    ? 'border-gray-200 bg-white text-gray-300 cursor-not-allowed'
                    : 'border-blue-400 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-500'
                }`}
              >
                {paginationPrevLabel}
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || sortedGroups.length === 0}
                className={`px-3 py-1 rounded-md border-2 text-sm transition-colors ${
                  currentPage === totalPages || sortedGroups.length === 0
                    ? 'border-gray-200 bg-white text-gray-300 cursor-not-allowed'
                    : 'border-blue-400 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-500'
                }`}
              >
                {paginationNextLabel}
              </button>
            </div>
          </div>
        </section>
        {pendingUpdate && (
          <div
            className="fixed inset-0 z-[1046] flex items-center justify-center bg-transparent"
            onClick={handleCancelUpdate}
          >
            <div
              className="w-full max-w-md rounded-2xl border-2 border-emerald-500 bg-white/90 p-4 text-sm text-gray-700 shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-600">
                  <TriangleAlert className="h-5 w-5" strokeWidth={2.5} />
                  <span className="text-lg font-bold text-gray-900">
                    {pendingUpdate.group.groupCode} → {pendingUpdate.newCode}
                  </span>
                </div>
                <p className="whitespace-pre-line">
                  {updateConfirmMessage}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelUpdate}
                  className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
                >
                  {cancelButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdate}
                  className="rounded-lg border-2 border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  {confirmUpdateButtonLabel}
                </button>
              </div>
            </div>
          </div>
        )}
        {deletingGroup && (
          <div
            className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent"
            onClick={handleCancelDelete}
          >
            <div
              className="w-full max-w-md rounded-2xl border-2 border-red-500 bg-white/90 p-4 text-sm text-gray-700 shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-red-600">
                  <TriangleAlert className="h-5 w-5" strokeWidth={2.5} />
                  <span className="text-lg font-bold text-gray-900">{deletingGroup.groupCode}</span>
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
                  {cancelButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  {confirmDeleteButtonLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
