import React from 'react';

import { Label, LabelProps } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedQuestionCircleIcon,
  OutlinedWindowRestoreIcon,
} from '@patternfly/react-icons';

import { Execution } from '#~/third_party/mlmd';

type ExecutionStatusProps = {
  status: Execution.State;
  isCompact?: boolean;
};

export const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ status, isCompact }) => {
  let color: LabelProps['color'];
  let statusProp: LabelProps['status'];
  let icon: React.ReactNode;
  let label: string;

  switch (status) {
    case Execution.State.COMPLETE:
      statusProp = 'success';
      icon = <CheckCircleIcon />;
      label = 'Complete';
      break;
    case Execution.State.CACHED:
      statusProp = 'success';
      icon = <OutlinedWindowRestoreIcon />;
      label = 'Cached';
      break;
    case Execution.State.CANCELED:
      color = 'grey';
      icon = <BanIcon />;
      label = 'Canceled';
      break;
    case Execution.State.FAILED:
      statusProp = 'danger';
      icon = <ExclamationCircleIcon />;
      label = 'Failed';
      break;
    case Execution.State.RUNNING:
      color = 'blue';
      icon = <InProgressIcon />;
      label = 'Running';
      break;
    case Execution.State.NEW:
      color = 'purple';
      label = 'New';
      break;
    default:
      color = 'grey';
      icon = <OutlinedQuestionCircleIcon />;
      label = 'Unknown';
  }

  return (
    <Label variant="outline" color={color} status={statusProp} icon={icon} isCompact={isCompact}>
      {label}
    </Label>
  );
};
