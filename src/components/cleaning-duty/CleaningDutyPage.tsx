"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { useTenantStaticTranslations } from '@/src/components/common/StaticI18nProvider';
import { logError, logInfo } from '@/src/lib/logging/log.util';
import {
  type CleaningDutyRow,
  type CleaningDutyHistoryCycle,
  type CleaningDutyAssigneeCandidate,
  fetchCurrentDuties,
  fetchHistory,
  completeCycle,
  toggleDuty,
  changeAssignee,
  fetchAssigneeCandidates,
  createDutyRow,
  deleteDuty,
} from '@/src/lib/api/cleaningDutyApi';
import { CleaningDutyHeader } from './CleaningDutyHeader';

export interface CleaningDutyPageProps {
  tenantId: string;
  tenantName?: string;
  userId: string;
  groupCode: string | null;
  residenceCode: string | null;
  isGroupLeader: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

export const CleaningDutyPage: React.FC<CleaningDutyPageProps> = ({
  tenantId,
  tenantName,
  userId,
  groupCode,
  residenceCode,
  isGroupLeader,
}) => {
  const { t } = useStaticI18n();
  useTenantStaticTranslations({ tenantId, apiPath: 'cleaning-duty' });

  const [duties, setDuties] = useState<CleaningDutyRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const [assigneeCandidates, setAssigneeCandidates] =
    useState<CleaningDutyAssigneeCandidate[]>([]);
  const [isAssigneeLoading, setIsAssigneeLoading] = useState(false);
  const [editingDutyId, setEditingDutyId] = useState<string | null>(null);
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyCycles, setHistoryCycles] = useState<CleaningDutyHistoryCycle[]>([]);

  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // このページ表示中に一度でも完了処理を実行したら、誤連打防止のため完了ボタンを無効化する
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);

  const [isCreatingNewDuty, setIsCreatingNewDuty] = useState(false);
  const [newDutyAssigneeId, setNewDutyAssigneeId] = useState<string>('');

  const hasGroup = !!groupCode;

  const resolveMessage = useCallback(
    (key: string): string => {
      return t(key);
    },
    [t],
  );

  useEffect(() => {
    if (!tenantId || !groupCode) {
      setAssigneeCandidates([]);
      return;
    }

    let cancelled = false;

    const loadAssignees = async () => {
      setIsAssigneeLoading(true);
      try {
        const list = await fetchAssigneeCandidates({ tenantId, groupCode });
        if (!cancelled) {
          setAssigneeCandidates(list);
        }
      } catch (error) {
        if (!cancelled) {
          setAssigneeCandidates([]);
        }
        logError('cleaningDuty.error', {
          tenantId,
          userId,
          groupCode,
          operation: 'fetchAssigneeCandidates',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) {
          setIsAssigneeLoading(false);
        }
      }
    };

    void loadAssignees();

    return () => {
      cancelled = true;
    };
  }, [tenantId, groupCode, userId]);

  const assigneeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const candidate of assigneeCandidates) {
      if (candidate.id && candidate.firstName) {
        map[candidate.id] = candidate.firstName;
      }
    }
    return map;
  }, [assigneeCandidates]);

  const invalidAssigneeIds = useMemo(() => {
    const missing = new Set<string>();

    for (const row of duties) {
      if (!row.assigneeId) continue;
      if (!assigneeNameById[row.assigneeId]) {
        missing.add(row.assigneeId);
      }
    }

    return Array.from(missing);
  }, [assigneeNameById, duties]);

  const hasInvalidAssignees = invalidAssigneeIds.length > 0;

  useEffect(() => {
    if (!tenantId || !groupCode) return;
    if (!hasInvalidAssignees) return;

    logError('cleaningDuty.data_inconsistent.assignee_not_resolved', {
      tenantId,
      userId,
      groupCode,
      invalidAssigneeIds,
    });
  }, [tenantId, userId, groupCode, hasInvalidAssignees, invalidAssigneeIds]);

  const assignedAssigneeIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of duties) {
      if (row.assigneeId) {
        set.add(row.assigneeId);
      }
    }
    return set;
  }, [duties]);

  const usedResidenceCodes = useMemo(() => {
    const set = new Set<string>();
    for (const row of duties) {
      if (row.residenceCode) {
        set.add(row.residenceCode);
      }
    }
    return set;
  }, [duties]);

  const availableAssigneeCandidates = useMemo(
    () =>
      assigneeCandidates.filter(
        (candidate) =>
          !assignedAssigneeIds.has(candidate.id)
          && !usedResidenceCodes.has(candidate.residenceCode),
      ),
    [assigneeCandidates, assignedAssigneeIds, usedResidenceCodes],
  );

  const loadCurrentDuties = useCallback(async () => {
    if (!tenantId || !groupCode) {
      setDuties([]);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const rows = await fetchCurrentDuties({ tenantId, groupCode });
      setDuties(rows);

      logInfo('cleaningDuty.page.view', {
        tenantId,
        userId,
        groupCode,
        route: '/cleaning-duty',
      });
    } catch (error) {
      setIsError(true);
      setDuties([]);

      logError('cleaningDuty.error', {
        tenantId,
        userId,
        groupCode,
        operation: 'fetchCurrent',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, groupCode, userId]);

  useEffect(() => {
    void loadCurrentDuties();
  }, [loadCurrentDuties]);

  const handleToggleDuty = useCallback(
    async (dutyId: string, nextIsDone: boolean) => {
      setDuties((prev) =>
        prev.map((row) =>
          row.id === dutyId
            ? {
                ...row,
                isDone: nextIsDone,
                cleanedOn: nextIsDone ? new Date().toISOString() : null,
              }
            : row,
        ),
      );

      try {
        const { cleanedOn } = await toggleDuty({ id: dutyId, isDone: nextIsDone });

        setDuties((prev) =>
          prev.map((row) =>
            row.id === dutyId
              ? {
                  ...row,
                  isDone: nextIsDone,
                  cleanedOn: cleanedOn ?? row.cleanedOn,
                }
              : row,
          ),
        );

        const target = duties.find((row) => row.id === dutyId);

        logInfo('cleaningDuty.duty.toggle', {
          tenantId,
          userId,
          groupCode,
          residenceCode: target?.residenceCode,
          cycleNo: target?.cycleNo,
          isDone: nextIsDone,
          cleanedOn: cleanedOn ?? null,
        });
      } catch (error) {
        setDuties((prev) =>
          prev.map((row) => (row.id === dutyId ? { ...row, isDone: !nextIsDone } : row)),
        );

        logError('cleaningDuty.error', {
          tenantId,
          userId,
          groupCode,
          operation: 'toggleDuty',
          dutyId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [duties, groupCode, tenantId, userId],
  );

  const handleStartEditAssignee = useCallback(
    (dutyId: string) => {
      if (!tenantId || !groupCode || !isGroupLeader) return;
      if (assigneeCandidates.length === 0) return;
      setEditingDutyId(dutyId);
    },
    [tenantId, groupCode, isGroupLeader, assigneeCandidates.length],
  );

  const handleChangeAssigneeImmediate = useCallback(
    async (dutyId: string, oldAssigneeId: string, newAssigneeId: string) => {
      if (!tenantId || !groupCode || !isGroupLeader) return;
      if (!newAssigneeId || newAssigneeId === oldAssigneeId) {
        setEditingDutyId(null);
        return;
      }

      const targetRow = duties.find((row) => row.id === dutyId);
      if (!targetRow) {
        setEditingDutyId(null);
        return;
      }

      setIsSavingAssignee(true);
      try {
        await changeAssignee({ id: dutyId, assigneeId: newAssigneeId });

        setDuties((prev) =>
          prev.map((row) => (row.id === dutyId ? { ...row, assigneeId: newAssigneeId } : row)),
        );

        logInfo('cleaningDuty.assignee.change', {
          tenantId,
          userId,
          groupCode,
          residenceCode: targetRow.residenceCode,
          oldAssigneeId,
          newAssigneeId,
        });
      } catch (error) {
        logError('cleaningDuty.error', {
          tenantId,
          userId,
          groupCode,
          operation: 'changeAssignee',
          dutyId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsSavingAssignee(false);
        setEditingDutyId(null);
      }
    },
    [tenantId, groupCode, isGroupLeader, duties, userId],
  );

  const handleDeleteDuty = useCallback(
    async (dutyId: string) => {
      if (!tenantId || !groupCode || !isGroupLeader) return;

      setIsSavingAssignee(true);
      try {
        // 楽観的にローカル状態から対象行を削除
        setDuties((prev) => prev.filter((row) => row.id !== dutyId));

        await deleteDuty({ tenantId, groupCode, id: dutyId });
        await loadCurrentDuties();
      } catch (error) {
        logError('cleaningDuty.error', {
          tenantId,
          userId,
          groupCode,
          operation: 'deleteRow',
          dutyId: dutyId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsSavingAssignee(false);
        setEditingDutyId(null);
      }
    },
    [tenantId, groupCode, isGroupLeader, loadCurrentDuties, userId],
  );

  const handleOpenHistory = useCallback(async () => {
    if (!tenantId || !groupCode) return;

    setIsHistoryLoading(true);
    setIsHistoryOpen(true);

    try {
      const cycles = await fetchHistory({ tenantId, groupCode });
      setHistoryCycles(cycles);
    } catch (error) {
      setHistoryCycles([]);
      logError('cleaningDuty.error', {
        tenantId,
        userId,
        groupCode,
        operation: 'fetchHistory',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }, [tenantId, groupCode, userId]);

  const handleOpenCompleteDialog = useCallback(() => {
    if (!tenantId || !groupCode || !isGroupLeader) return;
    if (hasCompletedOnce) return;

    const hasAnyDuties = duties.length > 0;
    const allDone = hasAnyDuties && duties.every((row) => row.isDone);
    if (!hasAnyDuties || !allDone) return;

    setIsCompleteDialogOpen(true);
  }, [tenantId, groupCode, isGroupLeader, hasCompletedOnce, duties]);

  const handleConfirmComplete = useCallback(async () => {
    if (!tenantId || !groupCode || !isGroupLeader) return;
    if (hasCompletedOnce) return;

    setIsCompleting(true);

    try {
      // 楽観的にテーブル上の「済」と「清掃日」をクリアし、次サイクル開始イメージを即時反映
      setDuties((prev) =>
        prev.map((row) => ({
          ...row,
          isDone: false,
          cleanedOn: null,
        })),
      );

      await completeCycle({ tenantId, groupCode });
      logInfo('cleaningDuty.cycle.complete', {
        tenantId,
        userId,
        groupCode,
      });
      await loadCurrentDuties();
      setIsCompleteDialogOpen(false);
      setHasCompletedOnce(true);
    } catch (error) {
      logError('cleaningDuty.error', {
        tenantId,
        userId,
        groupCode,
        operation: 'completeCycle',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsCompleting(false);
    }
  }, [tenantId, groupCode, isGroupLeader, userId, loadCurrentDuties, hasCompletedOnce]);

  const handleCancelComplete = useCallback(() => {
    if (isCompleting) return;
    setIsCompleteDialogOpen(false);
  }, [isCompleting]);

  const handleStartCreateDuty = useCallback(() => {
    if (!tenantId || !groupCode || !isGroupLeader) return;
    if (availableAssigneeCandidates.length === 0) return;

    setIsCreatingNewDuty(true);
    setNewDutyAssigneeId('');
  }, [tenantId, groupCode, isGroupLeader, availableAssigneeCandidates]);

  const handleCreateDutyFromBlankRow = useCallback(
    async (assigneeId: string) => {
      if (!tenantId || !groupCode || !isGroupLeader) return;
      const candidate = availableAssigneeCandidates.find((item) => item.id === assigneeId);
      if (!candidate || !candidate.residenceCode) return;

      setIsCreatingNewDuty(true);
      setNewDutyAssigneeId(assigneeId);

      try {
        await createDutyRow({
          tenantId,
          groupCode,
          residenceCode: candidate.residenceCode,
          assigneeId: candidate.id,
        });
        await loadCurrentDuties();
      } catch (error) {
        logError('cleaningDuty.error', {
          tenantId,
          userId,
          groupCode,
          operation: 'createRow',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsCreatingNewDuty(false);
        setNewDutyAssigneeId('');
      }
    },
    [
      tenantId,
      groupCode,
      isGroupLeader,
      availableAssigneeCandidates,
      loadCurrentDuties,
      userId,
    ],
  );

  const renderHistoryModal = () => {
    if (!isHistoryOpen) return null;

    const rows = historyCycles.flatMap((cycle) => cycle.items);

    return (
      <div
        className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/30"
        onClick={() => setIsHistoryOpen(false)}
      >
        <div
          className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white p-4 text-sm shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            {resolveMessage('cleaningDuty.history.title')}
          </h2>
          {isHistoryLoading ? (
            <p className="text-sm text-gray-500">
              {resolveMessage('cleaningDuty.history.loading')}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">
              {resolveMessage('cleaningDuty.history.empty')}
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      {resolveMessage('cleaningDuty.table.cleanedOn')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      {resolveMessage('cleaningDuty.table.residenceCode')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      {resolveMessage('cleaningDuty.table.assignee')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      {resolveMessage('cleaningDuty.table.completedAt')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-xs text-gray-900">
                        {formatDate(item.cleanedOn)}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-900">
                        {item.residenceCode}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-900">
                        {assigneeNameById[item.assigneeId]}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-900">
                        {formatDate(item.completedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {resolveMessage('cleaningDuty.history.close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCompleteDialog = () => {
    if (!isCompleteDialogOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/30"
        onClick={handleCancelComplete}
      >
        <div
          className="w-full max-w-md rounded-2xl border-2 border-blue-500 bg-white/95 p-4 text-sm text-gray-700 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="mb-2 text-base font-semibold text-gray-900">
            {resolveMessage('cleaningDuty.completeDialog.title')}
          </h2>
          <p className="mb-4 whitespace-pre-line">
            {resolveMessage('cleaningDuty.completeDialog.message')}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelComplete}
              disabled={isCompleting}
              className="rounded-lg border-2 border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resolveMessage('cleaningDuty.completeDialog.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmComplete}
              disabled={isCompleting}
              className="rounded-lg border-2 border-blue-500 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {resolveMessage('cleaningDuty.completeDialog.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!hasGroup) {
    const noGroupMessage = resolveMessage('cleaningDuty.error.noGroup');

    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
          <section className="flex-1 flex items-center justify-center">
            <div className="max-w-xl rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
              <p className="whitespace-pre-line">{noGroupMessage}</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const totalItems = duties.length;
  const MIN_ROWS = 5;
  const firstMinRows = duties.slice(0, MIN_ROWS);
  const hasFullMinAssignee =
    firstMinRows.length >= MIN_ROWS && firstMinRows.every((row) => !!row.assigneeId);
  const baseRowCount = Math.max(MIN_ROWS, totalItems);
  const targetRowCount = baseRowCount + (hasFullMinAssignee ? 1 : 0);
  const blankRowCount = Math.max(0, targetRowCount - totalItems);

  const hasAnyDuties = duties.length > 0;
  const allDone = hasAnyDuties && duties.every((row) => row.isDone);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pt-20 pb-24">
        <div className="flex-1 space-y-4">
          {tenantName && (
            <div className="flex justify-center">
              <p className="max-w-full truncate text-base text-gray-600" title={tenantName}>
                {tenantName}
              </p>
            </div>
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <CleaningDutyHeader groupCode={groupCode ?? ''} resolveMessage={resolveMessage} />

            {isLoading ? (
              <p className="text-sm text-gray-500">
                {resolveMessage('cleaningDuty.loading')}
              </p>
            ) : isError ? (
              <p className="text-sm text-red-600">
                {resolveMessage('cleaningDuty.error.fetchFailed')}
              </p>
            ) : hasInvalidAssignees ? (
              <p className="text-sm text-red-600">
                {resolveMessage('cleaningDuty.error.fetchFailed')}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse table-auto">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="w-12 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          {resolveMessage('cleaningDuty.table.result')}
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          {resolveMessage('cleaningDuty.table.cleanedOn')}
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                          {resolveMessage('cleaningDuty.table.residenceCode')}
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                          {resolveMessage('cleaningDuty.table.assignee')}
                        </th>
                        <th className="w-20 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          {resolveMessage('cleaningDuty.table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {duties.length === 0 ? (
                        <>
                          <tr>
                            <td
                              className="px-3 py-4 text-center text-xs text-gray-500"
                              colSpan={5}
                            >
                              {resolveMessage('cleaningDuty.empty')}
                            </td>
                          </tr>
                          {Array.from({ length: MIN_ROWS - 1 }).map((_, index) => {
                            const isFirstBlank = index === 0;
                            const canEditBlankRow =
                              isFirstBlank
                              && isGroupLeader
                              && availableAssigneeCandidates.length > 0;

                            return (
                              <tr
                                key={`blank-initial-${index}`}
                                className="border-b border-gray-100"
                              >
                                <td className="w-12 px-2 py-2 text-center text-xs text-gray-900" />
                                <td className="px-2 py-2 text-center text-xs text-gray-900" />
                                <td className="px-3 py-2 text-center text-xs text-gray-900" />
                                <td className="px-3 py-2 text-center text-xs text-gray-900" />
                                <td className="w-20 px-2 py-2 text-center text-xs text-gray-900">
                                  {canEditBlankRow ? (
                                    isCreatingNewDuty ? (
                                      <select
                                        value={newDutyAssigneeId}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          setNewDutyAssigneeId(value);
                                          if (!value) return;
                                          void handleCreateDutyFromBlankRow(value);
                                        }}
                                        disabled={isAssigneeLoading || isSavingAssignee}
                                        className="max-w-[7rem] rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                      >
                                        <option value="">{t('cleaningDuty.assignee.unselected')}</option>
                                        {availableAssigneeCandidates.map((candidate) => (
                                          <option key={candidate.id} value={candidate.id}>
                                            {candidate.firstName}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={handleStartCreateDuty}
                                        disabled={isAssigneeLoading}
                                        className="rounded-md border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {resolveMessage('cleaningDuty.actions.add')}
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          {duties.map((row) => {
                            const isOwnRow = residenceCode && row.residenceCode === residenceCode;
                            const isCompleted = !!row.completedAt;
                            const checkboxDisabled = !isOwnRow || isCompleted;

                            const assigneeOptions = assigneeCandidates.filter(
                              (candidate) =>
                                candidate.id === row.assigneeId
                                || !assignedAssigneeIds.has(candidate.id),
                            );

                            return (
                              <tr
                                key={row.id}
                                className="border-b border-gray-100 hover:bg-gray-50"
                              >
                                <td className="w-12 px-2 py-2 text-center text-xs text-gray-900">
                                  <input
                                    type="checkbox"
                                    checked={row.isDone}
                                    disabled={checkboxDisabled}
                                    onChange={() => {
                                      void handleToggleDuty(row.id, !row.isDone);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-2 py-2 text-center text-xs text-gray-900">
                                  {formatDate(row.cleanedOn)}
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-gray-900">
                                  {row.residenceCode}
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-gray-900">
                                  {assigneeNameById[row.assigneeId]}
                                </td>
                                <td className="w-20 px-2 py-2 text-center text-xs text-gray-900">
                                  {isGroupLeader && !isCompleted ? (
                                    editingDutyId === row.id ? (
                                      <select
                                        value={row.assigneeId}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          if (!value) {
                                            void handleDeleteDuty(row.id);
                                            return;
                                          }
                                          void handleChangeAssigneeImmediate(
                                            row.id,
                                            row.assigneeId,
                                            value,
                                          );
                                        }}
                                        disabled={isAssigneeLoading || isSavingAssignee}
                                        className="max-w-[7rem] rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                      >
                                        <option value="">{t('cleaningDuty.assignee.unselected')}</option>
                                        {assigneeOptions.map((candidate) => (
                                          <option key={candidate.id} value={candidate.id}>
                                            {candidate.firstName}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleStartEditAssignee(row.id);
                                        }}
                                        disabled={isAssigneeLoading || assigneeCandidates.length === 0}
                                        className="rounded-md border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {resolveMessage('cleaningDuty.actions.edit')}
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {Array.from({ length: blankRowCount }).map((_, index) => {
                            const isFirstBlank = index === 0;
                            const canEditBlankRow =
                              isFirstBlank
                              && isGroupLeader
                              && availableAssigneeCandidates.length > 0;

                            return (
                              <tr
                                key={`blank-${index}`}
                                className="border-b border-gray-100"
                              >
                                <td className="w-12 px-2 py-2 text-center text-xs text-gray-900" />
                                <td className="px-2 py-2 text-center text-xs text-gray-900" />
                                <td className="px-3 py-2 text-center text-xs text-gray-900" />
                                <td className="px-3 py-2 text-center text-xs text-gray-900" />
                                <td className="px-2 py-2 text-center text-xs text-gray-900">
                                  {canEditBlankRow ? (
                                    isCreatingNewDuty ? (
                                      <select
                                        value={newDutyAssigneeId}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          setNewDutyAssigneeId(value);
                                          if (!value) return;
                                          void handleCreateDutyFromBlankRow(value);
                                        }}
                                        disabled={isAssigneeLoading || isSavingAssignee}
                                        className="max-w-[7rem] rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                      >
                                        <option value="">{t('cleaningDuty.assignee.unselected')}</option>
                                        {availableAssigneeCandidates.map((candidate) => (
                                          <option key={candidate.id} value={candidate.id}>
                                            {candidate.firstName}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={handleStartCreateDuty}
                                        disabled={isAssigneeLoading}
                                        className="rounded-md border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {resolveMessage('cleaningDuty.actions.add')}
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-4 flex items-center">
              <div className="w-12 px-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    void handleOpenHistory();
                  }}
                  className="rounded-md border-2 border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                  {resolveMessage('cleaningDuty.actions.history')}
                </button>
              </div>
              <div className="flex-1" />
              <div className="w-20 px-2 text-center">
                {isGroupLeader && (
                  <button
                    type="button"
                    onClick={handleOpenCompleteDialog}
                    className="rounded-md border-2 border-blue-400 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                    disabled={
                      isLoading
                      || isCompleting
                      || hasCompletedOnce
                      || !hasAnyDuties
                      || !allDone
                    }
                  >
                    {resolveMessage('cleaningDuty.actions.complete')}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {renderHistoryModal()}
      {renderCompleteDialog()}
    </main>
  );
};

CleaningDutyPage.displayName = 'CleaningDutyPage';

export default CleaningDutyPage;
