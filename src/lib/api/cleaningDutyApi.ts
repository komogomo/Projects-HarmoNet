// cleaningDutyApi.ts will be implemented here according to WS-CXX_CleaningDutyPage_v1.0 and the CleaningDuty detailed design.

import { supabase } from '../../../lib/supabaseClient';
import { logError } from '@/src/lib/logging/log.util';

export type CleaningDutyRow = {
  id: string;
  residenceCode: string;
  cycleNo: number;
  assigneeId: string;
  isDone: boolean;
  cleanedOn: string | null;
  completedAt: string | null;
};

export type CleaningDutyAssigneeCandidate = {
  id: string;
  firstName: string;
  residenceCode: string;
};

export type CleaningDutyHistoryItem = {
  id: string;
  residenceCode: string;
  assigneeId: string;
  isDone: boolean;
  cleanedOn: string | null;
  completedAt: string;
};

export type CleaningDutyHistoryCycle = {
  cycleNo: number;
  completedAt: string | null;
  items: CleaningDutyHistoryItem[];
};

type FetchCurrentDutiesParams = {
  tenantId: string;
  groupCode: string;
};

type ToggleDutyParams = {
  id: string;
  isDone: boolean;
};

type ChangeAssigneeParams = {
  id: string;
  assigneeId: string;
};

type CompleteCycleParams = {
  tenantId: string;
  groupCode: string;
};

type FetchHistoryParams = {
  tenantId: string;
  groupCode: string;
};

type FetchAssigneeCandidatesParams = {
  tenantId: string;
  groupCode: string;
};

type CreateDutyRowParams = {
	tenantId: string;
	groupCode: string;
	residenceCode: string;
	assigneeId: string;
};

type DeleteDutyParams = {
	tenantId: string;
	groupCode: string;
	id: string;
};

export async function fetchCurrentDuties(
  params: FetchCurrentDutiesParams,
): Promise<CleaningDutyRow[]> {
  const { tenantId, groupCode } = params;

  try {
    const response = await fetch('/api/cleaning-duty/current', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      rows?: CleaningDutyRow[];
      errorCode?: string;
    };

    if (!response.ok || data.ok !== true || !Array.isArray(data.rows)) {
      logError('cleaningDuty.error', {
        tenantId,
        groupCode,
        operation: 'fetchCurrent',
        errorCode: data?.errorCode,
      });
      return [];
    }

    return data.rows;
  } catch (error) {
    logError('cleaningDuty.error', {
      tenantId,
      groupCode,
      operation: 'fetchCurrent',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function createDutyRow(params: CreateDutyRowParams): Promise<void> {
	const { tenantId, groupCode, residenceCode, assigneeId } = params;

	try {
		const response = await fetch('/api/cleaning-duty/create', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ residenceCode, assigneeId }),
		});

		const data = (await response.json().catch(() => ({}))) as {
			ok?: boolean;
			errorCode?: string;
		};

		if (!response.ok || data?.ok !== true) {
			logError('cleaningDuty.error', {
				tenantId,
				groupCode,
				operation: 'createRow',
				errorCode: data?.errorCode,
			});
			throw new Error(data?.errorCode || 'createRow_failed');
		}
	} catch (error) {
		logError('cleaningDuty.error', {
			tenantId,
			groupCode,
			operation: 'createRow',
			errorMessage: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function deleteDuty(params: DeleteDutyParams): Promise<void> {
	const { tenantId, groupCode, id } = params;

	try {
		const response = await fetch('/api/cleaning-duty/delete', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ id }),
		});

		const data = (await response.json().catch(() => ({}))) as {
			ok?: boolean;
			errorCode?: string;
		};

		if (!response.ok || data?.ok !== true) {
			logError('cleaningDuty.error', {
				tenantId,
				groupCode,
				operation: 'deleteRow',
				dutyId: id,
				errorCode: data?.errorCode,
			});
			throw new Error(data?.errorCode || 'deleteRow_failed');
		}
	} catch (error) {
		logError('cleaningDuty.error', {
			tenantId,
			groupCode,
			operation: 'deleteRow',
			dutyId: id,
			errorMessage: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export async function fetchAssigneeCandidates(
  params: FetchAssigneeCandidatesParams,
): Promise<CleaningDutyAssigneeCandidate[]> {
  const { tenantId, groupCode } = params;

  try {
    const response = await fetch('/api/cleaning-duty/assignee-candidates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      candidates?: { id: string; firstName: string; residenceCode: string }[];
      errorCode?: string;
    };

    if (!response.ok || data.ok !== true || !Array.isArray(data.candidates)) {
      logError('cleaningDuty.error', {
        tenantId,
        groupCode,
        operation: 'fetchAssigneeCandidates',
        errorCode: data?.errorCode,
      });
      throw new Error(data?.errorCode || 'fetchAssigneeCandidates_failed');
    }

    return data.candidates.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      residenceCode: c.residenceCode,
    }));
  } catch (error) {
    logError('cleaningDuty.error', {
      tenantId,
      groupCode,
      operation: 'fetchAssigneeCandidates',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function toggleDuty(params: ToggleDutyParams): Promise<{ cleanedOn: string | null }> {
  const { id, isDone } = params;

  try {
    const response = await fetch('/api/cleaning-duty/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, isDone }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      cleanedOn?: string | null;
      errorCode?: string;
    };

    if (!response.ok || data?.ok !== true) {
      logError('cleaningDuty.error', {
        operation: 'toggleDuty',
        dutyId: id,
        errorCode: data?.errorCode,
        status: response.status,
      });
      throw new Error(data?.errorCode || 'toggleDuty_failed');
    }

    return { cleanedOn: typeof data.cleanedOn === 'string' ? data.cleanedOn : null };
  } catch (error) {
    logError('cleaningDuty.error', {
      operation: 'toggleDuty',
      dutyId: id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function changeAssignee(params: ChangeAssigneeParams): Promise<void> {
  const { id, assigneeId } = params;

  try {
    const { error } = await supabase
      .from('cleaning_duties')
      .update({ assignee_id: assigneeId })
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    logError('cleaningDuty.error', {
      operation: 'changeAssignee',
      dutyId: id,
      assigneeId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function completeCycle(params: CompleteCycleParams): Promise<void> {
  const { tenantId, groupCode } = params;

  try {
    const response = await fetch('/api/cleaning-duty/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId, groupCode }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      errorCode?: string;
    };

    if (!response.ok || data?.ok !== true) {
      const errorCode = data?.errorCode;

      logError('cleaningDuty.error', {
        tenantId,
        groupCode,
        operation: 'completeCycle',
        errorCode,
      });

      throw new Error(errorCode || 'completeCycle_failed');
    }
  } catch (error) {
    logError('cleaningDuty.error', {
      tenantId,
      groupCode,
      operation: 'completeCycle',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function fetchHistory(
  params: FetchHistoryParams,
): Promise<CleaningDutyHistoryCycle[]> {
  const { tenantId, groupCode } = params;

  try {
    const { data, error } = await supabase
      .from('cleaning_duties')
      .select(
        'id, tenant_id, group_code, residence_code, cycle_no, assignee_id, is_done, cleaned_on, completed_at',
      )
      .eq('tenant_id', tenantId)
      .eq('group_code', groupCode)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .order('residence_code', { ascending: true });

    if (error) {
      throw error;
    }

    const cycleOrder: number[] = [];
    const cycleSet = new Set<number>();

    for (const row of data ?? []) {
      const cycleNo = (row as any).cycle_no as number;
      if (!cycleSet.has(cycleNo)) {
        cycleSet.add(cycleNo);
        cycleOrder.push(cycleNo);
        if (cycleOrder.length >= 3) break;
      }
    }

    if (!cycleOrder.length) {
      return [];
    }

    const relevantCycles = new Set(cycleOrder);
    const cyclesMap = new Map<number, CleaningDutyHistoryCycle>();

    for (const row of data ?? []) {
      const cycleNo = (row as any).cycle_no as number;
      if (!relevantCycles.has(cycleNo)) continue;

      const residenceCode = (row as any).residence_code as string;
      const completedAtRaw = (row as any).completed_at;
      const completedAt = completedAtRaw ? String(completedAtRaw) : null;

      let cycle = cyclesMap.get(cycleNo);
      if (!cycle) {
        cycle = {
          cycleNo,
          completedAt,
          items: [],
        };
        cyclesMap.set(cycleNo, cycle);
      }

      cycle.items.push({
        id: (row as any).id as string,
        residenceCode,
        assigneeId: (row as any).assignee_id as string,
        isDone: Boolean((row as any).is_done),
        cleanedOn: (row as any).cleaned_on ? String((row as any).cleaned_on) : null,
        completedAt: completedAt ?? '',
      });
    }

    const cycles: CleaningDutyHistoryCycle[] = cycleOrder
      .map((cycleNo) => cyclesMap.get(cycleNo))
      .filter((cycle): cycle is CleaningDutyHistoryCycle => !!cycle);

    return cycles;
  } catch (error) {
    logError('cleaningDuty.error', {
      tenantId,
      groupCode,
      operation: 'fetchHistory',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
