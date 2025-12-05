"use client";

import React, { useEffect, useState } from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

type TenantStatus = "active" | "inactive";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

interface TenantListItem {
  id: string;
  tenant_code: string;
  tenant_name: string;
  timezone: string;
  status: TenantStatus;
  created_at: string | null;
}

interface TenantAdminUser {
  userId: string;
  email: string;
  displayName: string;
  fullName: string;
  lastLogin?: string | null;
}

interface SysAdminTenantsConsoleProps {
  initialTenants: TenantListItem[] | null | undefined;
}

const TENANT_TIMEZONE_OPTIONS = ["Asia/Tokyo"];

export const SysAdminTenantsConsole: React.FC<SysAdminTenantsConsoleProps> = ({
  initialTenants,
}) => {
  const { t, currentLocale } = useI18n();

  const safeInitial = initialTenants ?? [];
  // const firstTenant = safeInitial.length > 0 ? safeInitial[0] : null; // Default selection removed

  const [tenants, setTenants] = useState<TenantListItem[]>(safeInitial);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const [tenantFormMode, setTenantFormMode] = useState<"create" | "edit">("create");
  const [tenantCode, setTenantCode] = useState<string>("");
  const [tenantName, setTenantName] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("Asia/Tokyo");
  const [tenantStatus, setTenantStatus] = useState<TenantStatus>("active");
  const [tenantMessage, setTenantMessage] = useState<MessageState>(null);
  const [tenantSaving, setTenantSaving] = useState(false);
  const [tenantConfirm, setTenantConfirm] = useState<
    null | "update" | "delete"
  >(null);
  const [tenantIdToDelete, setTenantIdToDelete] = useState<string | null>(null);
  const [deleteCheckTenantId, setDeleteCheckTenantId] = useState<string | null>(
    null,
  );

  const [messages, setMessages] = useState<Record<string, string>>({});

  const [admins, setAdmins] = useState<TenantAdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<MessageState>(null);
  const [adminFormMode, setAdminFormMode] = useState<"create" | "edit">(
    "create",
  );
  const [adminEmail, setAdminEmail] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [confirmRemoveAdminId, setConfirmRemoveAdminId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // if (firstTenant) {
    //   loadAdmins(firstTenant.id);
    // }
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        const params = new URLSearchParams({ lang: currentLocale });
        const res = await fetch(
          `/api/sys-admin/tenants/translations?${params.toString()}`,
        );

        if (!res.ok) {
          if (!cancelled) {
            setMessages({});
          }
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          messages?: Record<string, string>;
        };

        if (!cancelled && data && data.messages && typeof data.messages === "object") {
          setMessages(data.messages);
        }
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
  }, [currentLocale]);

  async function loadAdmins(targetTenantId: string) {
    setAdminsLoading(true);
    setAdminMessage(null);
    try {
      const res = await fetch(
        `/api/sys-admin/tenants/${targetTenantId}/admins`,
      );
      if (!res.ok) {
        setAdminMessage({
          type: "error",
          text: "sysadmin.tenants.adminPanel.loadError",
        });
        setAdmins([]);
        return;
      }
      const data = (await res.json().catch(() => [])) as any[];
      const mapped: TenantAdminUser[] = (data || []).map((row: any) => ({
        userId: row.userId,
        email: row.email,
        displayName: row.displayName,
        fullName: row.fullName,
        lastLogin: row.lastLogin ?? null,
      }));
      setAdmins(mapped);
    } catch {
      setAdminMessage({
        type: "error",
        text: "sysadmin.tenants.adminPanel.loadError",
      });
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  }

  const isTenantFormValid =
    tenantCode.trim().length > 0 &&
    tenantName.trim().length > 0 &&
    timezone.trim().length > 0;

  // Check if data is changed (dirty)
  const isTenantDirty = React.useMemo(() => {
    if (tenantFormMode === "create") {
      // In create mode, it's dirty if any field has content (though usually we just check validity)
      // But user requirement is "only active when no duplication" -> "only active when changed/valid"
      // For create, if valid, it's effectively "changed" from empty.
      return true;
    }
    if (tenantFormMode === "edit" && selectedTenantId) {
      const original = tenants.find((t) => t.id === selectedTenantId);
      if (!original) return false;
      return (
        original.tenant_code !== tenantCode ||
        original.tenant_name !== tenantName ||
        (original.timezone || "Asia/Tokyo") !== timezone
        // status is handled separately via buttons usually, but here it's part of the form state?
        // Actually status is not in the main form inputs shown in the image, but let's check.
        // The image shows Code, Name, Timezone. Status seems to be internal or separate.
        // But `performTenantUpdate` uses `tenantStatus`.
        // Let's assume status change also counts if it were editable, but the form inputs shown are Code, Name, Timezone.
      );
    }
    return false;
  }, [tenantFormMode, selectedTenantId, tenants, tenantCode, tenantName, timezone]);

  const isAdminFormValid =
    adminEmail.trim().length > 0 &&
    adminDisplayName.trim().length > 0 &&
    adminFullName.trim().length > 0;

  const resolveMessage = (key: string, fallback?: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    if (typeof fallback === "string" && fallback.trim().length > 0) {
      return fallback;
    }
    return t(key);
  };

  const handleSelectTenant = (tenant: TenantListItem) => {
    setSelectedTenantId(tenant.id);
    setTenantFormMode("edit");
    setTenantCode(tenant.tenant_code);
    setTenantName(tenant.tenant_name);
    setTimezone(tenant.timezone || "Asia/Tokyo");
    setTenantStatus(tenant.status === "inactive" ? "inactive" : "active");
    setTenantMessage(null);

    setAdminFormMode("create");
    setAdminEmail("");
    setAdminDisplayName("");
    setAdminFullName("");
    setEditingAdminId(null);
    setConfirmRemoveAdminId(null);
    setAdminMessage(null);

    setDeleteCheckTenantId(null);

    loadAdmins(tenant.id);
  };

  const handleNewTenantClick = () => {
    setSelectedTenantId(null);
    setTenantFormMode("create");
    setTenantCode("");
    setTenantName("");
    setTimezone("Asia/Tokyo");
    setTenantStatus("active");
    setTenantMessage(null);

    setAdmins([]);
    setAdminFormMode("create");
    setAdminEmail("");
    setAdminDisplayName("");
    setAdminFullName("");
    setEditingAdminId(null);
    setConfirmRemoveAdminId(null);
    setAdminMessage(null);

    setDeleteCheckTenantId(null);
  };

  const handleTenantSave = async () => {
    if (!isTenantFormValid) {
      setTenantMessage({
        type: "error",
        text: "sysadmin.tenants.error.validation",
      });
      return;
    }

    if (tenantFormMode === "create") {
      setTenantSaving(true);
      setTenantMessage(null);
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
        if (!res.ok || !result.ok || !result.tenantId) {
          const message =
            result.message || "sysadmin.tenants.error.internal";
          setTenantMessage({ type: "error", text: message });
          return;
        }
        const newTenant: TenantListItem = {
          id: result.tenantId as string,
          tenant_code: tenantCode,
          tenant_name: tenantName,
          timezone,
          status: "active",
          created_at: new Date().toISOString(),
        };
        const nextTenants = [newTenant, ...tenants];
        setTenants(nextTenants);
        setSelectedTenantId(newTenant.id);
        setTenantFormMode("edit");
        setTenantStatus("active");
        setTenantMessage({
          type: "success",
          text: "sysadmin.tenants.save.success",
        });
      } catch {
        setTenantMessage({
          type: "error",
          text: "sysadmin.tenants.error.internal",
        });
      } finally {
        setTenantSaving(false);
      }
    } else if (selectedTenantId) {
      setTenantConfirm("update");
    }
  };

  const performTenantUpdate = async (nextStatus?: TenantStatus) => {
    if (!selectedTenantId) return;

    setTenantSaving(true);
    setTenantMessage(null);

    const targetStatus: TenantStatus = nextStatus ?? tenantStatus;

    try {
      const res = await fetch(`/api/sys-admin/tenants/${selectedTenantId}`, {
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
        const message =
          result.message || "sysadmin.tenants.error.internal";
        setTenantMessage({ type: "error", text: message });
        return;
      }

      setTenantStatus(targetStatus);
      setTenants((current) =>
        current.map((t) =>
          t.id === selectedTenantId
            ? {
              ...t,
              tenant_name: tenantName,
              timezone,
              status: targetStatus,
            }
            : t,
        ),
      );

      let text = "sysadmin.tenants.save.success";
      if (nextStatus === "inactive") {
        text = "sysadmin.tenants.deactivate.success";
      } else if (nextStatus === "active") {
        text = "sysadmin.tenants.activate.success";
      }
      setTenantMessage({ type: "success", text });
    } catch {
      setTenantMessage({
        type: "error",
        text: "sysadmin.tenants.error.internal",
      });
    } finally {
      setTenantSaving(false);
      setTenantConfirm(null);
      setTenantIdToDelete(null);
    }
  };

  const performTenantDelete = async () => {
    const targetId = tenantIdToDelete ?? selectedTenantId;
    if (!targetId) {
      setTenantConfirm(null);
      return;
    }

    setTenantSaving(true);
    setTenantMessage(null);

    try {
      const res = await fetch(`/api/sys-admin/tenants/${targetId}`, {
        method: "DELETE",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) {
        const message =
          result.message || "sysadmin.tenants.error.internal";
        setTenantMessage({ type: "error", text: message });
        return;
      }

      setTenants((current) =>
        current.filter((t) => t.id !== targetId),
      );

      // フォームと管理者パネルを初期状態に戻す
      handleNewTenantClick();

      setTenantMessage({
        type: "success",
        text: "sysadmin.tenants.delete.success",
      });
    } catch {
      setTenantMessage({
        type: "error",
        text: "sysadmin.tenants.error.internal",
      });
    } finally {
      setTenantSaving(false);
      setTenantConfirm(null);
      setDeleteCheckTenantId(null);
    }
  };

  const handleAdminSubmit = async () => {
    if (!selectedTenantId) {
      setAdminMessage({
        type: "error",
        text: "sysadmin.tenants.error.validation",
      });
      return;
    }
    if (!isAdminFormValid) {
      setAdminMessage({
        type: "error",
        text: "sysadmin.tenants.error.validation",
      });
      return;
    }

    setAdminMessage(null);

    try {
      if (adminFormMode === "create") {
        const res = await fetch(
          `/api/sys-admin/tenants/${selectedTenantId}/admins`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: adminEmail,
              displayName: adminDisplayName,
              fullName: adminFullName,
            }),
          },
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.ok) {
          const message =
            result.message || "sysadmin.tenants.error.internal";
          setAdminMessage({ type: "error", text: message });
          return;
        }
        await loadAdmins(selectedTenantId);
        setAdminFormMode("create");
        setAdminEmail("");
        setAdminDisplayName("");
        setAdminFullName("");
        setEditingAdminId(null);
        setAdminMessage({
          type: "success",
          text: result.message || "sysadmin.tenants.admin.create.success",
        });
      } else if (adminFormMode === "edit" && editingAdminId) {
        const res = await fetch(
          `/api/sys-admin/tenants/${selectedTenantId}/admins/${editingAdminId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: adminDisplayName,
              fullName: adminFullName,
            }),
          },
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.ok) {
          const message =
            result.message || "sysadmin.tenants.error.internal";
          setAdminMessage({ type: "error", text: message });
          return;
        }
        await loadAdmins(selectedTenantId);
        setAdminFormMode("create");
        setAdminEmail("");
        setAdminDisplayName("");
        setAdminFullName("");
        setEditingAdminId(null);
        setAdminMessage({
          type: "success",
          text:
            result.message || "sysadmin.tenants.admin.update.success",
        });
      }
    } catch {
      setAdminMessage({
        type: "error",
        text: "sysadmin.tenants.error.internal",
      });
    }
  };

  const handleAdminEditClick = (admin: TenantAdminUser) => {
    setAdminFormMode("edit");
    setEditingAdminId(admin.userId);
    setAdminEmail(admin.email);
    setAdminDisplayName(admin.displayName);
    setAdminFullName(admin.fullName);
    setAdminMessage(null);
  };

  const handleAdminRemoveClick = (admin: TenantAdminUser) => {
    setConfirmRemoveAdminId(admin.userId);
  };

  const handleConfirmRemoveAdmin = async () => {
    if (!selectedTenantId || !confirmRemoveAdminId) return;

    try {
      const res = await fetch(
        `/api/sys-admin/tenants/${selectedTenantId}/admins/${confirmRemoveAdminId}`,
        {
          method: "DELETE",
        },
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) {
        const message =
          result.message || "sysadmin.tenants.error.internal";
        setAdminMessage({ type: "error", text: message });
        return;
      }
      await loadAdmins(selectedTenantId);
      setAdminFormMode("create");
      setAdminEmail("");
      setAdminDisplayName("");
      setAdminFullName("");
      setEditingAdminId(null);
      setAdminMessage({
        type: "success",
        text:
          result.message || "sysadmin.tenants.admin.remove.success",
      });
    } catch {
      setAdminMessage({
        type: "error",
        text: "sysadmin.tenants.error.internal",
      });
    } finally {
      setConfirmRemoveAdminId(null);
    }
  };

  const handleCancelRemoveAdmin = () => {
    setConfirmRemoveAdminId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 上部: テナント詳細 + 管理者管理 */}
      <section className="order-1 space-y-4">
        {/* テナント詳細フォーム */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {resolveMessage(
                  "sysadmin.tenants.form.title",
                  "テナント詳細",
                )}
              </h2>
              <p className="mt-1 text-[11px] text-gray-500">
                {resolveMessage(
                  "sysadmin.tenants.form.description",
                  "テナントの基本情報を編集します。",
                )}
              </p>
            </div>
          </div>

          {tenantMessage && (
            <div
              className={`mb-3 rounded border px-3 py-1.5 text-[11px] ${tenantMessage.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
                }`}
            >
              {tenantMessage.text.startsWith("sysadmin.")
                ? resolveMessage(tenantMessage.text)
                : tenantMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-700">
                {resolveMessage(
                  "sysadmin.tenants.form.tenantCode.label",
                  "テナントコード",
                )}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tenantCode}
                onChange={(event) => setTenantCode(event.target.value)}
                disabled={tenantFormMode === "edit"}
                maxLength={32}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700">
                {resolveMessage(
                  "sysadmin.tenants.form.tenantName.label",
                  "テナント名",
                )}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                maxLength={80}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700">
                {resolveMessage(
                  "sysadmin.tenants.form.timezone.label",
                  "タイムゾーン",
                )}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                disabled={tenantFormMode === "edit"}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {TENANT_TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-[11px] text-gray-500">
              {selectedTenantId
                ? `${resolveMessage(
                    "sysadmin.tenants.form.selectedTenantLabel",
                    "選択中のテナント: ",
                  )}${
                    tenants.find((t) => t.id === selectedTenantId)?.tenant_name ?? "-"
                  }`
                : resolveMessage(
                    "sysadmin.tenants.form.newTenantPlaceholder",
                    "新規テナントを作成します。",
                  )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleNewTenantClick}
                className="rounded border-2 border-gray-300 bg-white px-4 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {resolveMessage(
                  "sysadmin.tenants.form.clearButton",
                  "クリア",
                )}
              </button>
              <button
                type="button"
                disabled={!isTenantFormValid || tenantSaving || !isTenantDirty}
                onClick={handleTenantSave}
                className="rounded border-2 border-blue-500 bg-white px-4 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-300 disabled:bg-gray-50"
              >
                {resolveMessage(
                  "sysadmin.tenants.form.submitButton",
                  "登録",
                )}
              </button>
            </div>
          </div>
        </div>

        {/* テナント管理者管理パネル */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {resolveMessage(
                  "sysadmin.tenants.adminPanel.title",
                  "テナント管理者管理",
                )}
              </h2>
              <p className="mt-1 text-[11px] text-gray-500">
                {resolveMessage(
                  "sysadmin.tenants.adminPanel.description",
                  "選択中テナントの管理者ユーザを登録・編集できます。",
                )}
              </p>
            </div>
          </div>

          {adminMessage && (
            <div
              className={`mb-3 rounded border px-3 py-1.5 text-[11px] ${adminMessage.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
                }`}
            >
              {adminMessage.text.startsWith("sysadmin.")
                ? resolveMessage(adminMessage.text)
                : adminMessage.text}
            </div>
          )}

          {!selectedTenantId ? (
            <p className="text-xs text-gray-600">
              {resolveMessage(
                "sysadmin.tenants.adminPanel.noTenantSelected",
                "管理者を操作するには、下の一覧からテナントを選択してください。",
              )}
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-gray-700">
                    {resolveMessage(
                      "sysadmin.tenants.adminPanel.email.label",
                      "メールアドレス",
                    )}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)}
                    disabled={adminFormMode === "edit"}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-gray-700">
                    {resolveMessage(
                      "sysadmin.tenants.adminPanel.displayName.label",
                      "表示名",
                    )}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminDisplayName}
                    onChange={(event) =>
                      setAdminDisplayName(event.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-gray-700">
                    {resolveMessage(
                      "sysadmin.tenants.adminPanel.fullName.label",
                      "氏名",
                    )}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminFullName}
                    onChange={(event) => setAdminFullName(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    disabled={!isAdminFormValid}
                    onClick={handleAdminSubmit}
                    className={
                      "mt-4 rounded border-2 px-4 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 " +
                      (adminFormMode === "create"
                        ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                        : "border-blue-500 bg-white text-blue-600 hover:bg-blue-50")
                    }
                  >
                    {adminFormMode === "create"
                      ? resolveMessage(
                          "sysadmin.tenants.adminPanel.createButton",
                          "管理者ユーザ登録",
                        )
                      : resolveMessage(
                          "sysadmin.tenants.adminPanel.updateButton",
                          "管理者ユーザ更新",
                        )}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                {adminsLoading ? (
                  <p className="text-xs text-gray-600">
                    {resolveMessage(
                      "sysadmin.tenants.adminPanel.loading",
                      "管理者一覧を読み込み中です...",
                    )}
                  </p>
                ) : admins.length === 0 ? (
                  <p className="text-xs text-gray-600">
                    {resolveMessage(
                      "sysadmin.tenants.adminPanel.empty",
                      "このテナントの管理者ユーザは登録されていません。",
                    )}
                  </p>
                ) : (
                  <div className="overflow-auto rounded border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">
                            {resolveMessage(
                              "sysadmin.tenants.adminPanel.table.email",
                              "メールアドレス",
                            )}
                          </th>
                          <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">
                            {resolveMessage(
                              "sysadmin.tenants.adminPanel.table.displayName",
                              "表示名",
                            )}
                          </th>
                          <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">
                            {resolveMessage(
                              "sysadmin.tenants.adminPanel.table.fullName",
                              "氏名",
                            )}
                          </th>
                          <th className="px-3 py-1.5 text-xs font-semibold text-gray-700 text-center whitespace-nowrap w-40">
                            {resolveMessage(
                              "sysadmin.tenants.adminPanel.table.actions",
                              "操作",
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {admins.map((admin) => (
                          <tr key={admin.userId} className="text-xs">
                            <td className="px-3 py-1.5 text-blue-600">
                              {admin.email}
                            </td>
                            <td className="px-3 py-1.5 text-gray-900">
                              {admin.displayName}
                            </td>
                            <td className="px-3 py-1.5 text-gray-900">
                              {admin.fullName}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <div className="flex justify-end space-x-2">
                                <button
                                  type="button"
                                  className="rounded border-2 border-gray-300 bg-white px-2 py-0.5 text-[10px] text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                  onClick={() => handleAdminEditClick(admin)}
                                >
                                  {resolveMessage(
                                    "sysadmin.tenants.adminPanel.editButton",
                                    "編集",
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="rounded border-2 border-red-300 bg-white px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-50 whitespace-nowrap"
                                  onClick={() => handleAdminRemoveClick(admin)}
                                >
                                  {resolveMessage(
                                    "sysadmin.tenants.adminPanel.removeButton",
                                    "管理者解除",
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 下部: テナント一覧 */}
      <section className="order-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {resolveMessage(
              "sysadmin.tenants.table.title",
              "テナント一覧",
            )}
          </h2>
        </div>
        {tenants.length === 0 ? (
          <p className="text-xs text-gray-600">
            {resolveMessage(
              "sysadmin.tenants.table.empty",
              "テナントが登録されていません。",
            )}
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-auto rounded border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-1.5 text-center text-[10px] font-medium text-gray-500 w-16">
                    {resolveMessage(
                      "sysadmin.tenants.table.header.delete",
                      "削除",
                    )}
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">
                    {resolveMessage(
                      "sysadmin.tenants.table.header.tenantCode",
                      "テナントコード",
                    )}
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">
                    {resolveMessage(
                      "sysadmin.tenants.table.header.tenantName",
                      "テナント名",
                    )}
                  </th>
                  <th className="px-3 py-1.5 text-xs font-semibold text-gray-700 text-center whitespace-nowrap w-28">
                    {resolveMessage(
                      "sysadmin.tenants.table.header.actions",
                      "操作",
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tenants.map((tenant) => {
                  const isSelected = tenant.id === selectedTenantId;
                  return (
                    <tr
                      key={tenant.id}
                      className={
                        "cursor-pointer text-xs hover:bg-gray-50" +
                        (isSelected ? " bg-blue-50" : "")
                      }
                      onClick={() => handleSelectTenant(tenant)}
                    >
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={deleteCheckTenantId === tenant.id}
                          onChange={(event) => {
                            event.stopPropagation();
                            setDeleteCheckTenantId(
                              event.target.checked ? tenant.id : null,
                            );
                          }}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-blue-600">
                        {tenant.tenant_code}
                      </td>
                      <td className="px-3 py-1.5 text-gray-900">
                        {tenant.tenant_name}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          disabled={deleteCheckTenantId !== tenant.id}
                          className="rounded border-2 border-red-300 bg-white px-3 py-0.5 text-[10px] text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:bg-gray-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            setTenantIdToDelete(tenant.id);
                            setTenantConfirm("delete");
                          }}
                        >
                          {resolveMessage(
                            "sysadmin.tenants.table.row.deleteButton",
                            "削除",
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* テナント更新・削除確認モーダル */}
      {tenantConfirm && (
        <div className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent">
          <div
            className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
          >
            <p className="mb-3 whitespace-pre-line">
              {tenantConfirm === "update" &&
                resolveMessage(
                  "sysadmin.tenants.confirm.update.message",
                  "テナント情報を保存してよろしいですか？",
                )}
              {tenantConfirm === "delete" &&
                resolveMessage(
                  "sysadmin.tenants.confirm.delete.message",
                  "このテナントを削除してよろしいですか？\n削除すると、このテナントの利用者はログインできなくなります。",
                )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTenantConfirm(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                {resolveMessage(
                  "sysadmin.tenants.confirm.cancel",
                  "キャンセル",
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tenantConfirm === "update") {
                    performTenantUpdate();
                  } else if (tenantConfirm === "delete") {
                    performTenantDelete();
                  }
                }}
                className="font-semibold text-red-500 hover:text-red-600"
              >
                {resolveMessage(
                  "sysadmin.tenants.confirm.ok",
                  "OK",
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理者解除確認モーダル */}
      {confirmRemoveAdminId && (
        <div className="fixed inset-0 z-[1045] flex items-center justify-center bg-transparent">
          <div
            className="w-full max-w-xs rounded-2xl border-2 border-gray-200 bg-white/90 p-4 text-xs text-gray-700 shadow-lg"
          >
            <p className="mb-3 whitespace-pre-line">
              {resolveMessage(
                "sysadmin.tenants.confirm.removeAdmin.message",
                "管理者ロールを解除してよろしいですか？",
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelRemoveAdmin}
                className="text-gray-400 hover:text-gray-600"
              >
                {resolveMessage(
                  "sysadmin.tenants.confirm.cancel",
                  "キャンセル",
                )}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveAdmin}
                className="font-semibold text-red-500 hover:text-red-600"
              >
                {resolveMessage(
                  "sysadmin.tenants.confirm.ok",
                  "OK",
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysAdminTenantsConsole;
