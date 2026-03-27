import React from 'react';
import {
  AngleDoubleRightIcon,
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { RunStatus } from '@patternfly/react-topology';
import { Icon, Tooltip } from '@patternfly/react-core';
import { runtimeStateLabels, RuntimeStateKF } from '#~/concepts/pipelines/kfTypes';

const NodeStatusIcon: React.FC<{ runStatus: RunStatus | string }> = ({ runStatus }) => {
  let icon: React.ReactNode;
  let status: React.ComponentProps<typeof Icon>['status'];
  let label: string;

  switch (runStatus) {
    case RunStatus.Pending:
    case RunStatus.Idle:
      icon = <PendingIcon />;
      label = runtimeStateLabels[RuntimeStateKF.PENDING];
      break;
    case RunStatus.Running:
    case RunStatus.InProgress:
      icon = <InProgressIcon />;
      status = 'info';
      label = runtimeStateLabels[RuntimeStateKF.RUNNING];
      break;
    case RunStatus.Skipped:
      icon = <AngleDoubleRightIcon />;
      status = 'success';
      label = runtimeStateLabels[RuntimeStateKF.SKIPPED];
      break;
    case RunStatus.Succeeded:
      icon = <CheckCircleIcon />;
      status = 'success';
      label = runtimeStateLabels[RuntimeStateKF.SUCCEEDED];
      break;
    case RunStatus.Failed:
    case RunStatus.FailedToStart:
      icon = <ExclamationCircleIcon />;
      status = 'danger';
      label = runtimeStateLabels[RuntimeStateKF.FAILED];
      break;
    case RunStatus.Cancelled:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.CANCELED];
      break;
    case undefined:
    default:
      icon = null;
      label = '';
  }

  return (
    <Tooltip content={label}>
      <Icon status={status} isInline>
        {icon}
      </Icon>
    </Tooltip>
  );
};

export default NodeStatusIcon;
