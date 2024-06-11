import React from 'react';
import { Icon, Label, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedWindowRestoreIcon,
  PendingIcon,
  TimesCircleIcon,
} from '@patternfly/react-icons';
import { Execution } from '~/third_party/mlmd';

type ExecutionStatusProps = {
  status: Execution.State;
  isIcon?: boolean;
};

const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ status, isIcon }) => {
  let tooltip;
  let icon;
  let label;
  switch (status) {
    case Execution.State.COMPLETE:
      icon = (
        <Icon status="success">
          <CheckCircleIcon />
        </Icon>
      );
      tooltip = 'Complete';
      label = (
        <Label color="green" icon={<CheckCircleIcon />}>
          Complete
        </Label>
      );
      break;
    case Execution.State.CACHED:
      icon = (
        <Icon status="custom">
          <OutlinedWindowRestoreIcon />
        </Icon>
      );
      tooltip = 'Cached';
      label = (
        <Label color="cyan" icon={<OutlinedWindowRestoreIcon />}>
          Cached
        </Label>
      );
      break;
    case Execution.State.CANCELED:
      icon = (
        <Icon>
          <TimesCircleIcon />
        </Icon>
      );
      tooltip = 'Canceled';
      label = <Label icon={<TimesCircleIcon />}>Canceled</Label>;
      break;
    case Execution.State.FAILED:
      icon = (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      );
      tooltip = 'Failed';
      label = (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Failed
        </Label>
      );
      break;
    case Execution.State.RUNNING:
      icon = <Icon isInProgress />;
      tooltip = 'Running';
      label = <Label icon={<InProgressIcon />}>Running</Label>;
      break;
    case Execution.State.NEW:
      icon = (
        <Icon>
          <PendingIcon />
        </Icon>
      );
      tooltip = 'New';
      label = <Label icon={<PendingIcon />}>New</Label>;
      break;
    default:
      icon = <>Unknown</>;
      label = <Label>Unknown</Label>;
  }

  return isIcon ? <Tooltip content={tooltip}>{icon}</Tooltip> : <>{label}</>;
};

export default ExecutionStatus;
