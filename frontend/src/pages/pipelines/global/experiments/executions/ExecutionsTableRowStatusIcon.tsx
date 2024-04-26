import React from 'react';
import { Icon, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedWindowRestoreIcon,
  QuestionCircleIcon,
  TimesCircleIcon,
} from '@patternfly/react-icons';
import { Execution } from '~/third_party/mlmd';

type ExecutionsTableRowStatusIconProps = {
  status: Execution.State;
};

const ExecutionsTableRowStatusIcon: React.FC<ExecutionsTableRowStatusIconProps> = ({ status }) => {
  let tooltip;
  let icon;
  switch (status) {
    case Execution.State.COMPLETE:
      icon = (
        <Icon status="success">
          <CheckCircleIcon />
        </Icon>
      );
      tooltip = 'Complete';
      break;
    case Execution.State.CACHED:
      icon = (
        <Icon status="custom">
          <OutlinedWindowRestoreIcon />
        </Icon>
      );
      tooltip = 'Cached';
      break;
    case Execution.State.CANCELED:
      icon = (
        <Icon>
          <TimesCircleIcon />
        </Icon>
      );
      tooltip = 'Canceled';
      break;
    case Execution.State.FAILED:
      icon = (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      );
      tooltip = 'Failed';
      break;
    case Execution.State.RUNNING:
      icon = <Icon isInProgress />;
      tooltip = 'Running';
      break;
    // TODO: change the icon here
    case Execution.State.NEW:
      icon = (
        <Icon>
          <QuestionCircleIcon />
        </Icon>
      );
      tooltip = 'New';
      break;
    default:
      icon = (
        <Icon>
          <QuestionCircleIcon />
        </Icon>
      );
      tooltip = 'Unknown';
  }

  return <Tooltip content={tooltip}>{icon}</Tooltip>;
};

export default ExecutionsTableRowStatusIcon;
