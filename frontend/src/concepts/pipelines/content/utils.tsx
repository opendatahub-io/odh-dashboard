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
import {
  PipelineCoreResourceKFv2,
  PipelineRunJobKF,
  PipelineRunKFv2,
  RuntimeStateKF,
  runtimeStateLabels,
} from '~/concepts/pipelines/kfTypes';

export type RunStatusDetails = {
  icon: React.ReactNode;
  label: PipelineRunKFv2['state'] | string;
  status?: React.ComponentProps<typeof Icon>['status'];
  details?: string;
};

const UNKNOWN_ICON = <QuestionCircleIcon />;
const UNKNOWN_STATUS = 'warning';

export const computeRunStatus = (run?: PipelineRunKFv2 | null): RunStatusDetails => {
  if (!run) {
    return { icon: UNKNOWN_ICON, status: UNKNOWN_STATUS, label: '-' };
  }
  let icon: React.ReactNode;
  let status: React.ComponentProps<typeof Icon>['status'];
  let details: string | undefined;
  let label: string;

  switch (run.state) {
    case RuntimeStateKF.PENDING:
    case RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED:
    case undefined:
      icon = <NotStartedIcon />;
      label = runtimeStateLabels[RuntimeStateKF.PENDING];
      break;
    case RuntimeStateKF.RUNNING:
      icon = <SyncAltIcon />;
      label = runtimeStateLabels[RuntimeStateKF.RUNNING];
      break;
    case RuntimeStateKF.SKIPPED:
      icon = <CheckCircleIcon />;
      label = runtimeStateLabels[RuntimeStateKF.SKIPPED];
      break;
    case RuntimeStateKF.SUCCEEDED:
      icon = <CheckCircleIcon />;
      status = 'success';
      label = runtimeStateLabels[RuntimeStateKF.SUCCEEDED];
      break;
    case RuntimeStateKF.FAILED:
      icon = <ExclamationCircleIcon />;
      status = 'danger';
      label = runtimeStateLabels[RuntimeStateKF.FAILED];
      details = run.error?.message;
      break;
    case RuntimeStateKF.CANCELING:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.CANCELING];
      break;
    case RuntimeStateKF.CANCELED:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.CANCELED];
      break;
    case RuntimeStateKF.PAUSED:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.PAUSED];
      break;
    default:
      icon = UNKNOWN_ICON;
      status = UNKNOWN_STATUS;
      label = run.state ?? 'Starting';
      details = run.state ?? 'No status yet';
  }

  return { icon, label, status, details };
};

export const isPipelineRunJob = (
  runOrJob?: PipelineRunJobKF | PipelineRunKFv2,
): runOrJob is PipelineRunJobKF => !!(runOrJob as PipelineRunJobKF)?.trigger;

export const getPipelineAndVersionDeleteString = (
  resources: PipelineCoreResourceKFv2[],
  type: 'pipeline' | 'version',
): string => `${resources.length} ${type}${resources.length !== 1 ? 's' : ''}`;

export const getPipelineResourceUniqueID = (resource: PipelineCoreResourceKFv2): string =>
  resource.display_name + resource.created_at;
