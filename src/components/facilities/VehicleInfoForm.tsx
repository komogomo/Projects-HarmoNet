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

  const labels = facilityTranslations?.labels ?? {};
  const vehicleNumberLabel: string =
    (labels.vehicle_number as string | undefined) ?? "車両ナンバー（任意）";
  const vehicleModelLabel: string =
    (labels.vehicle_model as string | undefined) ?? "車種・色（任意）";

  return (
    <div className="space-y-3 text-xs text-gray-700">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">{vehicleNumberLabel}</label>
        <input
          type="text"
          className="mt-1 block w-full rounded-md border-2 border-gray-300 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={vehicleNumber}
          onChange={(event) => onChangeVehicleNumber(event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">{vehicleModelLabel}</label>
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

