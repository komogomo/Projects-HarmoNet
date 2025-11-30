"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export type TenantAdminFormMode = "create" | "edit";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export interface TenantAdminFormProps {
  mode: TenantAdminFormMode;
  tenantId: string;
  userId?: string;
  initialEmail?: string;
  initialDisplayName?: string;
  initialFullName?: string;
}

export const TenantAdminForm: React.FC<TenantAdminFormProps> = ({
  mode,
  tenantId,
  userId,
  initialEmail,
  initialDisplayName,
  initialFullName,
}) => {
  const router = useRouter();

  const [email, setEmail] = useState(initialEmail ?? "");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [fullName, setFullName] = useState(initialFullName ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isEdit = mode === "edit";

  const isFormValid =
    email.trim().length > 0 &&
    displayName.trim().length > 0 &&
    fullName.trim().length > 0;

  const handleCreate = async () => {
    if (!isFormValid) {
      setMessage({ type: "error", text: "入力内容を確認してください。" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/sys-admin/tenants/${tenantId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName,
          fullName,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.ok) {
        setMessage({
          type: "error",
          text:
            result.message ||
            "管理者ユーザの登録に失敗しました。時間をおいて再度お試しください。",
        });
        return;
      }

      setMessage({
        type: "success",
        text: result.message || "管理者ユーザを登録しました。",
      });
    } catch {
      setMessage({
        type: "error",
        text:
          "管理者ユーザの登録に失敗しました。時間をおいて再度お試しください。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!userId) return;

    if (!isFormValid) {
      setMessage({ type: "error", text: "入力内容を確認してください。" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/sys-admin/tenants/${tenantId}/admins/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            fullName,
          }),
        },
      );

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.ok) {
        setMessage({
          type: "error",
          text:
            result.message ||
            "管理者ユーザの更新に失敗しました。時間をおいて再度お試しください。",
        });
        return;
      }

      setMessage({
        type: "success",
        text: result.message || "管理者ユーザを登録しました。",
      });
    } catch {
      setMessage({
        type: "error",
        text:
          "管理者ユーザの更新に失敗しました。時間をおいて再度お試しください。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "create") {
      await handleCreate();
    } else {
      await handleUpdate();
    }
  };

  const handleRemoveClick = () => {
    if (!userId) return;
    setConfirmRemove(true);
  };

  const handleConfirmRemove = async () => {
    if (!userId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/sys-admin/tenants/${tenantId}/admins/${userId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.ok) {
        setMessage({
          type: "error",
          text:
            result.message ||
            "管理者ロールの解除に失敗しました。時間をおいて再度お試しください。",
        });
        setConfirmRemove(false);
        return;
      }

      router.push(
        `/sys-admin/tenants/${tenantId}/admins?message=admin-removed`,
      );
    } catch {
      setMessage({
        type: "error",
        text:
          "管理者ロールの解除に失敗しました。時間をおいて再度お試しください。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRemove = () => {
    setConfirmRemove(false);
  };

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
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isEdit}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() =>
              router.push(`/sys-admin/tenants/${tenantId}/admins`)
            }
            className="rounded-lg border-2 border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
          >
            管理者一覧へ
          </button>

          <div className="flex space-x-3">
            {isEdit && (
              <button
                type="button"
                onClick={handleRemoveClick}
                disabled={submitting}
                className="rounded-lg border-2 border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
              >
                管理者ロール解除
              </button>
            )}

            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className="rounded-lg border-2 border-blue-500 bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200"
            >
              保存
            </button>
          </div>
        </div>
      </form>

      {confirmRemove && (
        <div
          className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent"
          onClick={handleCancelRemove}
        >
          <div
            className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-3 whitespace-pre-line">
              管理者ロールを解除してよろしいですか？
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelRemove}
                className="text-gray-400 hover:text-gray-600"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
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

export default TenantAdminForm;
