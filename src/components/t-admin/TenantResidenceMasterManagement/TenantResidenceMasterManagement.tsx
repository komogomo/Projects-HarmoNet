"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { TriangleAlert, ChevronsUpDown } from 'lucide-react';
import { useI18n } from '@/src/components/common/StaticI18nProvider';
import type { TenantResidenceItem, TenantResidenceMasterManagementProps } from './TenantResidenceMasterManagement.types';

export const TenantResidenceMasterManagement: React.FC<TenantResidenceMasterManagementProps> = ({ tenantName, tenantId }) => {
  const { currentLocale } = useI18n();
  const [residences, setResidences] = useState<TenantResidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [editingResidenceId, setEditingResidenceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingResidence, setDeletingResidence] = useState<TenantResidenceItem | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ residence: TenantResidenceItem; newCode: string } | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const loadResidences = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/t-admin/residences');
      if (!res.ok) {
        setMessage({ type: 'error', text: 'tadmin.residences.error.listFailed' });
        setResidences([]);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        items?: TenantResidenceItem[];
        message?: string;
      };

      if (!data.ok || !Array.isArray(data.items)) {
        setMessage({ type: 'error', text: data.message || 'tadmin.residences.error.listFailed' });
        setResidences([]);
        return;
      }

      setResidences(data.items);
    } catch {
      setMessage({ type: 'error', text: 'tadmin.residences.error.listFailed' });
      setResidences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResidences();
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setMessages({});
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const params = new URLSearchParams({ tenantId, lang: currentLocale });

        const [residencesRes, usersRes] = await Promise.all([
          fetch(`/api/tenant-static-translations/t-admin-residences?${params.toString()}`),
          fetch(`/api/tenant-static-translations/t-admin-users?${params.toString()}`),
        ]);

        if (cancelled) return;

        const merged: Record<string, string> = {};

        const applyMessages = async (res: Response) => {
          if (!res.ok) return;
          const data = (await res.json().catch(() => ({}))) as {
            messages?: Record<string, string>;
          };
          if (data && data.messages && typeof data.messages === 'object') {
            for (const [key, value] of Object.entries(data.messages)) {
              if (typeof value === 'string') {
                merged[key] = value;
              }
            }
          }
        };

        await Promise.all([applyMessages(usersRes), applyMessages(residencesRes)]);

        setMessages(merged);
      } catch {
        if (!cancelled) {
          setMessages({});
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [tenantId, currentLocale]);

  const resolveMessage = (key: string): string => {
    const fromDb = messages[key];
    const trimmed = typeof fromDb === 'string' ? fromDb.trim() : '';
    if (trimmed.length > 0 && trimmed !== key) {
      return trimmed;
    }
    return '';
  };

  const handleEditClick = (item: TenantResidenceItem) => {
    setEditingResidenceId(item.id);
    setInputValue(item.residenceCode);
    setMessage(null);
  };

  const handleClearSelection = () => {
    setEditingResidenceId(null);
    setInputValue('');
    setMessage(null);
  };

  const handleRegister = async () => {
    if (!inputValue.trim()) {
      setMessage({ type: 'error', text: 'tadmin.residences.error.residenceCodeRequired' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/t-admin/residences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residenceCode: inputValue.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.message || 'tadmin.residences.error.registerFailed' });
        return;
      }

      setMessage({ type: 'success', text: 'tadmin.residences.success.registered' });
      setInputValue('');
      setEditingResidenceId(null);
      void loadResidences();
    } catch {
      setMessage({ type: 'error', text: 'tadmin.residences.error.registerFailed' });
    } finally {
      setSubmitting(false);
    }
  };

  const performUpdate = async (residenceId: string, newCode: string) => {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/t-admin/residences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residenceId, residenceCode: newCode }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.message || 'tadmin.residences.error.updateFailed' });
        return;
      }

      setMessage({ type: 'success', text: 'tadmin.residences.success.updated' });
      void loadResidences();
    } catch {
      setMessage({ type: 'error', text: 'tadmin.residences.error.updateFailed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClick = () => {
    if (!editingResidenceId) {
      setMessage({ type: 'error', text: 'tadmin.residences.error.updateTargetNotSelected' });
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'tadmin.residences.error.residenceCodeRequired' });
      return;
    }

    const target = residences.find((r) => r.id === editingResidenceId) || null;
    if (!target) {
      setMessage({ type: 'error', text: 'tadmin.residences.error.updateTargetMissing' });
      return;
    }

    setPendingUpdate({ residence: target, newCode: trimmed });
  };

  const performDelete = async (residenceId: string) => {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/t-admin/residences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residenceId }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; errorCode?: string };

      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.message || 'tadmin.residences.error.deleteFailed' });
        return;
      }

      setMessage({ type: 'success', text: 'tadmin.residences.success.deleted' });
      if (editingResidenceId === residenceId) {
        setEditingResidenceId(null);
        setInputValue('');
      }
      void loadResidences();
    } catch {
      setMessage({ type: 'error', text: 'tadmin.residences.error.deleteFailed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowDelete = (item: TenantResidenceItem) => {
    setDeletingResidence(item);
  };

  const handleCancelDelete = () => {
    setDeletingResidence(null);
  };

  const handleCancelUpdate = () => {
    setPendingUpdate(null);
  };

  const handleConfirmUpdate = async () => {
    if (!pendingUpdate) return;
    await performUpdate(pendingUpdate.residence.id, pendingUpdate.newCode);
    setPendingUpdate(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingResidence) return;
    const targetId = deletingResidence.id;
    await performDelete(targetId);
    setDeletingResidence(null);
  };

  const sortedResidences = useMemo(() => {
    const copied = [...residences];
    copied.sort((a, b) => {
      const av = a.residenceCode ?? '';
      const bv = b.residenceCode ?? '';
      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return copied;
  }, [residences, sortDirection]);

  const totalPages = sortedResidences.length === 0 ? 1 : Math.ceil(sortedResidences.length / itemsPerPage);
  const paginatedResidences = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedResidences.slice(start, end);
  }, [sortedResidences, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, sortDirection, residences.length]);

  const paginationPerPageLabel = resolveMessage('tadmin.users.pagination.perPage.label');
  const paginationRangeMiddleLabel = resolveMessage('tadmin.users.pagination.range.middle');
  const paginationRangeSuffixLabel = resolveMessage('tadmin.users.pagination.range.suffix');
  const paginationPrevLabel = resolveMessage('tadmin.users.pagination.prev');
  const paginationNextLabel = resolveMessage('tadmin.users.pagination.next');

  const residenceCodeLabel = resolveMessage('tadmin.residences.form.residenceCode.label');
  const registerButtonLabel = resolveMessage('tadmin.residences.form.registerButton');
  const updateButtonLabel = resolveMessage('tadmin.residences.form.updateButton');
  const residenceListTitleLabel = resolveMessage('tadmin.residences.list.title');
  const tableResidenceCodeHeaderLabel = resolveMessage('tadmin.residences.table.residenceCode');
  const tableActionsHeaderLabel = resolveMessage('tadmin.residences.table.actions');
  const loadingLabel = resolveMessage('tadmin.residences.list.loading');
  const emptyLabel = resolveMessage('tadmin.residences.list.empty');
  const actionEditLabel = resolveMessage('tadmin.users.actions.edit');
  const actionDeleteLabel = resolveMessage('tadmin.users.actions.delete');
  const clearSelectionLabel = resolveMessage('tadmin.residences.actions.clearSelection');
  const updateConfirmMessage = resolveMessage('tadmin.residences.modal.update.confirm');
  const deleteConfirmMessage = resolveMessage('tadmin.residences.modal.delete.confirm');
  const cancelButtonLabel = resolveMessage('tadmin.residences.modal.cancel');
  const confirmUpdateButtonLabel = resolveMessage('tadmin.residences.modal.confirmUpdate');
  const confirmDeleteButtonLabel = resolveMessage('tadmin.residences.modal.confirmDelete');

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
              <label htmlFor="residenceCode" className="block text-xs font-medium text-gray-700">
                {residenceCodeLabel}
              </label>
              <input
                id="residenceCode"
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
            <h2 className="text-sm font-semibold text-gray-800">{residenceListTitleLabel}</h2>
            {editingResidenceId && (
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
                      <span>{tableResidenceCodeHeaderLabel}</span>
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
                ) : residences.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-sm text-gray-500">
                      {emptyLabel}
                    </td>
                  </tr>
                ) : (
                  paginatedResidences.map((item) => {
                    const isEditing = item.id === editingResidenceId;
                    return (
                      <tr key={item.id} className={isEditing ? 'bg-blue-50/40' : undefined}>
                        <td
                          className="px-4 py-2 text-sm text-gray-800"
                          style={{ width: '18ch' }}
                        >
                          {item.residenceCode}
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
                              onClick={() => handleRowDelete(item)}
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
                {sortedResidences.length} {paginationRangeMiddleLabel}{' '}
                {sortedResidences.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, sortedResidences.length)} {paginationRangeSuffixLabel}
              </span>
            </div>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || sortedResidences.length === 0}
                className={`px-3 py-1 rounded-md border-2 text-sm transition-colors ${
                  currentPage === 1 || sortedResidences.length === 0
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
                disabled={currentPage === totalPages || sortedResidences.length === 0}
                className={`px-3 py-1 rounded-md border-2 text-sm transition-colors ${
                  currentPage === totalPages || sortedResidences.length === 0
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
                    {pendingUpdate.residence.residenceCode} → {pendingUpdate.newCode}
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
        {deletingResidence && (
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
                  <span className="text-lg font-bold text-gray-900">{deletingResidence.residenceCode}</span>
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
