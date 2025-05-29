import React from 'react';

import { Label, LabelProps } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedWindowRestoreIcon,
  PendingIcon,
} from '@patternfly/react-icons';

import { Execution } from '#~/third_party/mlmd';

type ExecutionStatusProps = {
  status: Execution.State;
  isCompact?: boolean;
};

export const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ status, isCompact }) => {
  let color: LabelProps['color'];
  let icon: React.ReactNode;
  let label: string;

  switch (status) {
    case Execution.State.COMPLETE:
      color = 'green';
      icon = <CheckCircleIcon />;
      label = 'Complete';
      break;
    case Execution.State.CACHED:
      color = 'green';
      icon = <OutlinedWindowRestoreIcon />;
      label = 'Cached';
      break;
    case Execution.State.CANCELED:
      color = 'orangered';
      icon = <BanIcon />;
      label = 'Canceled';
      break;
    case Execution.State.FAILED:
      color = 'red';
      icon = <ExclamationCircleIcon />;
      label = 'Failed';
      break;
    case Execution.State.RUNNING:
      color = 'blue';
      icon = <InProgressIcon />;
      label = 'Running';
      break;
    case Execution.State.NEW:
      icon = <PendingIcon />;
      label = 'Pending';
      break;
    default:
      label = 'Unknown';
  }

  return (
    <Label color={color} icon={icon} isCompact={isCompact}>
      {label}
    </Label>
  );
};
