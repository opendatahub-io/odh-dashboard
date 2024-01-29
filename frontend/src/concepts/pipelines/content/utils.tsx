import * as React from 'react';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  NotStartedIcon,
  QuestionCircleIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { Icon } from '@patternfly/react-core';
import { PipelineRunKF, PipelineRunStatusesKF } from '~/concepts/pipelines/kfTypes';

export type RunStatusDetails = {
  icon: React.ReactNode;
  label: PipelineRunKF['status'];
  status?: React.ComponentProps<typeof Icon>['status'];
  details?: string;
};

const UNKNOWN_ICON = <QuestionCircleIcon />;
const UNKNOWN_STATUS = 'warning';

export const computeRunStatus = (run?: PipelineRunKF): RunStatusDetails => {
  if (!run) {
    return { icon: UNKNOWN_ICON, status: UNKNOWN_STATUS, label: '-' };
  }
  let icon: React.ReactNode;
  let status: React.ComponentProps<typeof Icon>['status'];
  let details: string | undefined;
  let label: PipelineRunKF['status'];

  switch (run.status) {
    case PipelineRunStatusesKF.STARTED:
    case undefined:
      icon = <NotStartedIcon />;
      label = PipelineRunStatusesKF.STARTED;
      break;
    case PipelineRunStatusesKF.RUNNING:
      icon = <SyncAltIcon />;
      label = PipelineRunStatusesKF.RUNNING;
      break;
    case PipelineRunStatusesKF.COMPLETED:
    case 'Succeeded':
      icon = <CheckCircleIcon />;
      status = 'success';
      label = PipelineRunStatusesKF.COMPLETED;
      break;
    case PipelineRunStatusesKF.FAILED:
    case 'PipelineRunTimeout':
    case 'CreateRunFailed':
      icon = <ExclamationCircleIcon />;
      status = 'danger';
      label = PipelineRunStatusesKF.FAILED;
      details = run.error;
      break;
    case PipelineRunStatusesKF.CANCELLED:
      icon = <BanIcon />;
      label = PipelineRunStatusesKF.CANCELLED;
      break;
    default:
      icon = UNKNOWN_ICON;
      status = UNKNOWN_STATUS;
      label = run.status || 'Starting';
      details = run.status || 'No status yet';
  }

  return { icon, label, status, details };
};
