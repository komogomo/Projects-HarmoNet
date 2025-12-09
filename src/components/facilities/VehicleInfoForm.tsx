"use client";

import React from "react";

interface VehicleInfoFormProps {
  vehicleNumber?: string;
  vehicleModel?: string;
  onChangeVehicleNumber?: (value: string) => void;
  onChangeVehicleModel?: (value: string) => void;
  vehicleNumberLabel?: string;
  vehicleModelLabel?: string;
}

const VehicleInfoForm: React.FC<VehicleInfoFormProps> = ({
  vehicleNumber = "",
  vehicleModel = "",
  onChangeVehicleNumber,
  onChangeVehicleModel,
  vehicleNumberLabel = "",
  vehicleModelLabel = "",
}) => {

  return (
    <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
      <div className="space-y-1">
        <label className="block text-xs text-gray-600">{vehicleNumberLabel}</label>
        <input
          type="text"
          className="mt-1 block w-2/3 rounded-md border-2 border-gray-300 px-3 py-2 text-xs text-gray-600 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={vehicleNumber}
          onChange={(event) =>
            onChangeVehicleNumber ? onChangeVehicleNumber(event.target.value) : undefined
          }
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs text-gray-600">{vehicleModelLabel}</label>
        <input
          type="text"
          className="mt-1 block w-2/3 rounded-md border-2 border-gray-300 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={vehicleModel}
          onChange={(event) =>
            onChangeVehicleModel ? onChangeVehicleModel(event.target.value) : undefined
          }
        />
      </div>
    </div>
  );
};

export default VehicleInfoForm;

