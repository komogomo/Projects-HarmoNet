"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export type TenantStatus = "active" | "inactive";

export type TenantDetailFormMode = "create" | "edit";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export interface TenantDetailFormProps {
  mode: TenantDetailFormMode;
  tenantId?: string;
  initialCode?: string;
  initialName?: string;
  initialTimezone?: string;
  initialStatus?: TenantStatus;
}

export const TenantDetailForm: React.FC<TenantDetailFormProps> = ({
  mode,
  tenantId,
  initialCode,
  initialName,
  initialTimezone,
  initialStatus,
}) => {
  const router = useRouter();

  const [tenantCode, setTenantCode] = useState(initialCode ?? "");
  const [tenantName, setTenantName] = useState(initialName ?? "");
  const [timezone, setTimezone] = useState(initialTimezone ?? "Asia/Tokyo");
  const [status, setStatus] = useState<TenantStatus>(initialStatus ?? "active");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [confirmAction, setConfirmAction] = useState<
    | null
    | "update"
    | "deactivate"
    | "reactivate"
  >(null);

  const handleCreate = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/sys-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantCode,
          tenantName,
          timezone,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.ok) {
        setMessage({
          type: "error",
          text:
            result.message ||
            "テナントの登録に失敗しました。時間をおいて再度お試しください。",
        });
        return;
      }

      setMessage({ type: "success", text: "テナント情報を保存しました。" });
      router.push("/sys-admin/tenants");
    } catch {
      setMessage({
        type: "error",
        text: "テナントの登録に失敗しました。時間をおいて再度お試しください。",
      });
    } finally {
      setSaving(false);
    }
  };

  const performUpdate = async (nextStatus?: TenantStatus) => {
    if (!tenantId) return;

    setSaving(true);
    setMessage(null);

    const targetStatus: TenantStatus = nextStatus ?? status;

    try {
      const res = await fetch(`/api/sys-admin/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName,
          timezone,
          status: targetStatus,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.ok) {
        setMessage({
          type: "error",
          text:
            result.message ||
            "テナント情報の更新に失敗しました。時間をおいて再度お試しください。",
        });
        return;
      }

      setStatus(targetStatus);

      let text = "テナント情報を保存しました。";
      if (nextStatus === "inactive") {
        text =
          "テナントを無効化しました。このテナントの利用者はログインできなくなります。";
      } else if (nextStatus === "active") {
        text = "テナントを再有効化しました。";
      }

      setMessage({ type: "success", text });
    } catch {
      setMessage({
        type: "error",
        text:
          "テナント情報の更新に失敗しました。時間をおいて再度お試しください。",
      });
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "create") {
      await handleCreate();
    } else {
      setConfirmAction("update");
    }
  };

  const handleDeactivate = () => {
    setConfirmAction("deactivate");
  };

  const handleReactivate = () => {
    setConfirmAction("reactivate");
  };

  const handleConfirmOk = async () => {
    if (confirmAction === "update") {
      await performUpdate();
    } else if (confirmAction === "deactivate") {
      await performUpdate("inactive");
    } else if (confirmAction === "reactivate") {
      await performUpdate("active");
    }
  };

  const handleConfirmCancel = () => {
    setConfirmAction(null);
  };

  const isEdit = mode === "edit";

  const isFormValid =
    tenantCode.trim().length > 0 &&
    tenantName.trim().length > 0 &&
    timezone.trim().length > 0;

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              テナントコード <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isEdit}
              maxLength={32}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              テナント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={80}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              タイムゾーン <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Tokyo"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-700">
                状態
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {status === "inactive" ? "無効" : "有効"}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => router.push("/sys-admin/tenants")}
              className="rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
            >
              一覧に戻る
            </button>
            {isEdit && tenantId && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/sys-admin/tenants/${tenantId}/admins`)
                }
                className="rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
              >
                管理者一覧へ
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {isEdit && (
              <>
                {status === "active" ? (
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={saving}
                    className="rounded-lg border-2 border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                  >
                    無効化
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={saving}
                    className="rounded-lg border-2 border-blue-300 bg-white px-4 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                  >
                    再有効化
                  </button>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={!isFormValid || saving}
              className="rounded-lg border-2 border-blue-500 bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200"
            >
              保存
            </button>
          </div>
        </div>
      </form>

      {confirmAction && (
        <div
          className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent"
          onClick={handleConfirmCancel}
        >
          <div
            className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-3 whitespace-pre-line">
              {confirmAction === "update" && "テナント情報を保存してよろしいですか？"}
              {confirmAction === "deactivate" &&
                "テナントを無効化してよろしいですか？\nこのテナントの利用者はログインできなくなります。"}
              {confirmAction === "reactivate" &&
                "テナントを再有効化してよろしいですか？"}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmOk}
                className="font-semibold text-red-500 hover:text-red-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDetailForm;
