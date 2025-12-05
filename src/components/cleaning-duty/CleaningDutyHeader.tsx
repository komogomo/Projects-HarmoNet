import React from 'react';

export interface CleaningDutyHeaderProps {
  groupCode: string;
  resolveMessage: (key: string) => string;
}

export const CleaningDutyHeader: React.FC<CleaningDutyHeaderProps> = ({ groupCode, resolveMessage }) => {
  const titleSuffix = resolveMessage('cleaningDuty.titleSuffix');
  const title = groupCode ? `${groupCode}${titleSuffix}` : titleSuffix;

  return (
    <header className="mb-2">
      <p className="text-sm text-gray-900">{title}</p>
    </header>
  );
};

CleaningDutyHeader.displayName = 'CleaningDutyHeader';
