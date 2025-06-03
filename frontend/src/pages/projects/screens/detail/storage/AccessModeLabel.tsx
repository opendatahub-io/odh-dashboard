import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';

// Safely convert string to AccessMode
export const toAccessMode = (mode: string | undefined): AccessMode | undefined => {
  if (mode) {
    const validModes = Object.values(AccessMode);
    return validModes.find((validMode) => validMode === mode);
  }
  return undefined;
};

const ACCESS_MODE_MAP: Record<AccessMode, string> = {
  [AccessMode.RWO]: 'ReadWriteOnce (RWO)',
  [AccessMode.RWOP]: 'ReadWriteOncePod (RWOP)',
  [AccessMode.RWX]: 'ReadWriteMany (RWX)',
  [AccessMode.ROX]: 'ReadOnlyMany (ROX)',
};

type Props = {
  accessModeString: string | undefined;
};

const AccessModeLabel: React.FC<Props> = ({ accessModeString }) => {
  const accessMode = toAccessMode(accessModeString);
  const contents = accessMode ? ACCESS_MODE_MAP[accessMode] : '-';

  return <>{contents}</>;
};

export { ACCESS_MODE_MAP };
export default AccessModeLabel;
