import React from 'react';

function makeIcon(name: string) {
  const Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg aria-label={name} {...props} />
  );
  Icon.displayName = name;
  return Icon;
}

export const Loader2 = makeIcon('Loader2');
export const CheckCircle = makeIcon('CheckCircle');
export const AlertCircle = makeIcon('AlertCircle');
export const KeyRound = makeIcon('KeyRound');

export default { Loader2, CheckCircle, AlertCircle, KeyRound };
