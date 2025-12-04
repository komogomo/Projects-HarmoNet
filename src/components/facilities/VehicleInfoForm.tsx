"use client";

import React, { useEffect } from "react";
import { useStaticI18n as useI18n } from "@/src/components/common/StaticI18nProvider/StaticI18nProvider";

interface VehicleInfoFormProps {
  vehicleNumber: string;
  vehicleModel: string;
  onChangeVehicleNumber: (value: string) => void;
  onChangeVehicleModel: (value: string) => void;
}

const VehicleInfoForm: React.FC<VehicleInfoFormProps> = ({
  vehicleNumber,
  vehicleModel,
  onChangeVehicleNumber,
  onChangeVehicleModel,
}) => {
  const { currentLocale } = useI18n();

  const [facilityTranslations, setFacilityTranslations] = React.useState<any | null>(null);
  const [messages, setMessages] = React.useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/locales/${currentLocale}/facility.json`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setFacilityTranslations(data);
        }
      } catch {
        if (!cancelled) {
          setFacilityTranslations(null);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

  useEffect(() => {
    // VehicleInfoForm は tenantId を直接は持たないため、上位コンポーネントで
    // ラベルをテーブル化したい場合は、今後 props で文字列を渡す形に拡張する想定。
    // 現状は facility.json ベースのフォールバックのみを維持する。
    setMessages({});
  }, []);

  const labels = facilityTranslations?.labels ?? {};

  const resolveMessage = (key: string, fallback: string): string => {
    const fromDb = messages[key];
    if (typeof fromDb === "string" && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback;
  };

  const vehicleNumberLabelBase: string =
    (labels.vehicle_number as string | undefined) ?? "車両ナンバー（任意）";
  const vehicleNumberLabel: string = resolveMessage(
    "labels.vehicle_number",
    vehicleNumberLabelBase,
  );

  const vehicleModelLabelBase: string =
    (labels.vehicle_model as string | undefined) ?? "車種・色（任意）";
  const vehicleModelLabel: string = resolveMessage(
    "labels.vehicle_model",
    vehicleModelLabelBase,
  );

  return (
    <div className="space-y-3 text-xs text-gray-600">
      <div className="space-y-1">
        <label className="block text-xs text-gray-600">{vehicleNumberLabel}</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-2 border-gray-300 px-3 py-2 text-xs text-gray-600 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={vehicleNumber}
          onChange={(event) => onChangeVehicleNumber(event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs text-gray-600">{vehicleModelLabel}</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-2 border-gray-300 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={vehicleModel}
          onChange={(event) => onChangeVehicleModel(event.target.value)}
        />
      </div>
    </div>
  );
};

export default VehicleInfoForm;

