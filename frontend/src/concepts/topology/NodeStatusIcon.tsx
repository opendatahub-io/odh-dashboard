import React from 'react';
import {
  NotStartedIcon,
  SyncAltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BanIcon,
} from '@patternfly/react-icons';
import { Icon, Tooltip } from '@patternfly/react-core';
import { RuntimeStateKF, runtimeStateLabels } from '~/concepts/pipelines/kfTypes';

const NodeStatusIcon: React.FC<{ runStatus: RuntimeStateKF | string }> = ({ runStatus }) => {
  let icon: React.ReactNode;
  let status: React.ComponentProps<typeof Icon>['status'];
  let label: string;

  switch (runStatus) {
    case runtimeStateLabels[RuntimeStateKF.PENDING]:
    case runtimeStateLabels[RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED]:
      icon = <NotStartedIcon />;
      label = runtimeStateLabels[RuntimeStateKF.PENDING];
      break;
    case runtimeStateLabels[RuntimeStateKF.RUNNING]:
      icon = <SyncAltIcon />;
      label = runtimeStateLabels[RuntimeStateKF.RUNNING];
      break;
    case runtimeStateLabels[RuntimeStateKF.SKIPPED]:
      icon = <CheckCircleIcon />;
      label = runtimeStateLabels[RuntimeStateKF.SKIPPED];
      break;
    case runtimeStateLabels[RuntimeStateKF.SUCCEEDED]:
      icon = <CheckCircleIcon />;
      status = 'success';
      label = runtimeStateLabels[RuntimeStateKF.SUCCEEDED];
      break;
    case runtimeStateLabels[RuntimeStateKF.FAILED]:
      icon = <ExclamationCircleIcon />;
      status = 'danger';
      label = runtimeStateLabels[RuntimeStateKF.FAILED];
      break;
    case runtimeStateLabels[RuntimeStateKF.CANCELING]:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.CANCELING];
      break;
    case runtimeStateLabels[RuntimeStateKF.CANCELED]:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.CANCELED];
      break;
    case runtimeStateLabels[RuntimeStateKF.PAUSED]:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.PAUSED];
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
