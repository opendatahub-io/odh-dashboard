import * as React from 'react';
import { PopoverListContent } from '@odh-dashboard/ui-core';
import {
  ACCESS_MODE_DESCRIPTIONS,
  toAccessModeFullName,
} from '#~/pages/projects/screens/detail/storage/AccessModeFullName';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';

type AccessModePopoverProps = {
  canEditAccessMode?: boolean;
  currentAccessMode?: AccessMode;
  showAllAccessModes?: boolean;
  adminSupportedAccessModes?: AccessMode[];
};

export const getAccessModePopover = ({
  canEditAccessMode = true,
  currentAccessMode,
  showAllAccessModes = true,
  adminSupportedAccessModes,
}: AccessModePopoverProps): React.ReactNode => {
  const listItems: React.ReactNode[] = [];

  Object.values(AccessMode).forEach((accessMode) => {
    const hasAccessMode = adminSupportedAccessModes?.includes(accessMode);

    if (
      showAllAccessModes ||
      ((accessMode === AccessMode.RWO || hasAccessMode) && canEditAccessMode) ||
      currentAccessMode === accessMode
    ) {
      listItems.push(
        <React.Fragment key={accessMode}>
          <strong>{toAccessModeFullName(accessMode)}</strong> {ACCESS_MODE_DESCRIPTIONS[accessMode]}
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
