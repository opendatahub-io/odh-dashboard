import * as React from 'react';
import {
  ACCESS_MODE_DESCRIPTIONS,
  toAccessModeLabel,
} from '#~/pages/projects/screens/detail/storage/AccessModeLabel';
import PopoverListContent from '#~/components/PopoverListContent';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';

type AccessModePopoverProps = {
  showRWX?: boolean;
  showROX?: boolean;
  showRWOP?: boolean;
  hasRWX?: boolean;
  hasROX?: boolean;
  hasRWOP?: boolean;
  canEditAccessMode?: boolean;
  currentAccessMode?: AccessMode;
};

export const getAccessModePopover = ({
  showRWX = true,
  showROX = true,
  showRWOP = true,
  hasRWX = true,
  hasROX = true,
  hasRWOP = true,
  canEditAccessMode = true,
  currentAccessMode,
}: AccessModePopoverProps): React.ReactNode => {
  const listItems = [];
  if (canEditAccessMode || currentAccessMode === AccessMode.RWO) {
    listItems.push(
      <React.Fragment key="rwo">
        <strong>{toAccessModeLabel(AccessMode.RWO)}:</strong>{' '}
        {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWO]}
      </React.Fragment>,
    );
  }
  if ((showRWX && hasRWX && canEditAccessMode) || currentAccessMode === AccessMode.RWX) {
    listItems.push(
      <React.Fragment key="rwx">
        <strong>{toAccessModeLabel(AccessMode.RWX)}:</strong>{' '}
        {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWX]}
      </React.Fragment>,
    );
  }
  if ((showROX && hasROX && canEditAccessMode) || currentAccessMode === AccessMode.ROX) {
    listItems.push(
      <React.Fragment key="rox">
        <strong>{toAccessModeLabel(AccessMode.ROX)}:</strong>{' '}
        {ACCESS_MODE_DESCRIPTIONS[AccessMode.ROX]}
      </React.Fragment>,
    );
  }
  if ((showRWOP && hasRWOP && canEditAccessMode) || currentAccessMode === AccessMode.RWOP) {
    listItems.push(
      <React.Fragment key="rwop">
        <strong>{toAccessModeLabel(AccessMode.RWOP)}:</strong>{' '}
        {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWOP]}
      </React.Fragment>,
    );
  }
  return (
    <PopoverListContent
      leadText="Access mode is a Kubernetes concept that determines how nodes can interact with the volume."
      listItems={listItems}
    />
  );
};
