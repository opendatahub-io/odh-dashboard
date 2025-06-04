import * as React from 'react';
import {
  ACCESS_MODE_DESCRIPTIONS,
  toAccessModeLabel,
} from '#~/pages/projects/screens/detail/storage/AccessModeLabel';
import PopoverListContent from '#~/components/PopoverListContent';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';

type AccessModePopoverProps = {
  canEditAccessMode?: boolean;
  currentAccessMode?: AccessMode;
  showAllAccessModes?: boolean;
  openshiftSupportedAccessModes?: AccessMode[];
  adminSupportedAccessModes?: AccessMode[];
};

export const getAccessModePopover = ({
  canEditAccessMode = true,
  currentAccessMode,
  showAllAccessModes = true,
  openshiftSupportedAccessModes,
  adminSupportedAccessModes,
}: AccessModePopoverProps): React.ReactNode => {
  const listItems: React.ReactNode[] = [];
  Object.values(AccessMode).forEach((accessMode) => {
    const showAccessMode = openshiftSupportedAccessModes?.includes(accessMode);
    const hasAccessMode = adminSupportedAccessModes?.includes(accessMode);
    if (
      showAllAccessModes ||
      ((accessMode === AccessMode.RWO || (showAccessMode && hasAccessMode)) && canEditAccessMode) ||
      currentAccessMode === accessMode
    ) {
      listItems.push(
        <React.Fragment key={accessMode}>
          <strong>{toAccessModeLabel(accessMode)}:</strong> {ACCESS_MODE_DESCRIPTIONS[accessMode]}
        </React.Fragment>,
      );
    }
  });
  return (
    <PopoverListContent
      leadText="Access mode is a Kubernetes concept that determines how nodes can interact with the volume."
      listItems={listItems}
    />
  );
};
