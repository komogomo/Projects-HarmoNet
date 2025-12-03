"use client";

import React, { useMemo } from "react";

interface ReservationFormProps {
  maxParticipants?: number | null;
  selectedStartTime?: string | null;
  selectedEndTime?: string | null;
  purposeLabel: string;
  participantCountLabel: string;
  purpose: string;
  participantCount: string;
  onChangePurpose: (value: string) => void;
  onChangeParticipantCount: (value: string) => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  maxParticipants,
  selectedStartTime,
  selectedEndTime,
  purposeLabel,
  participantCountLabel,
  purpose,
  participantCount,
  onChangePurpose,
  onChangeParticipantCount,
}) => {

  const participantOptions = useMemo(() => {
    const raw = typeof maxParticipants === "number" && Number.isFinite(maxParticipants)
      ? maxParticipants
      : 20;
    const max = Math.max(1, Math.floor(raw));
    return Array.from({ length: max }, (_, index) => index + 1);
  }, [maxParticipants]);

  return (
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      {/* 予約時間（選択中レンジの表示） */}
      {selectedStartTime && selectedEndTime && (
        <p className="text-sm font-semibold text-gray-800">
          予約時間：{selectedStartTime} ～ {selectedEndTime}
        </p>
      )}

      {/* 利用目的 */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">
          {purposeLabel}
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          className="mt-1 block w-full min-h-[80px] rounded-md border-2 border-gray-300 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={purpose}
          onChange={(event) => onChangePurpose(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 text-xs text-gray-700 sm:flex-row">
        <div className="flex-1 space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            {participantCountLabel}
          </label>
          <select
            className="mt-1 block w-full rounded-md border-2 border-gray-300 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={participantCount}
            onChange={(event) => onChangeParticipantCount(event.target.value)}
          >
            <option value="">--</option>
            {participantOptions.map((n) => (
              <option
                key={n}
                value={n.toString()}
              >
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
};

export default ReservationForm;

