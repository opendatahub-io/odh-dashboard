import * as React from 'react';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import PopoverListContent from '#~/components/PopoverListContent';

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

const ACCESS_MODE_DESCRIPTIONS: Record<AccessMode, string> = {
  [AccessMode.RWO]: 'means that the storage can be attached to a single workbench at a given time.',
  [AccessMode.RWOP]:
    'means that the storage can be attached to a single pod on a single node as read-write',
  [AccessMode.RWX]: 'means that the storage can be attached to many workbenches simultaneously.',
  [AccessMode.ROX]: 'means that the storage can be attached to many workbenches as read-only.',
} as const;

export const AccessModeColumnInfo = (
  <PopoverListContent
    leadText="Access mode is a Kubernetes concept that determines how nodes can interact with the volume."
    listItems={[
      <React.Fragment key="rwo">
        <strong>ReadWriteOnce (RWO):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWO]}
      </React.Fragment>,
      <React.Fragment key="rwx">
        <strong>ReadWriteMany (RWX):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWX]}
      </React.Fragment>,
      <React.Fragment key="rox">
        <strong>ReadOnlyMany (ROX):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.ROX]}
      </React.Fragment>,
      <React.Fragment key="rwop">
        <strong>ReadWriteOncePod (RWOP):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWOP]}
      </React.Fragment>,
    ]}
  />
);

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
