import * as React from 'react';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  QuestionCircleIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { Icon, LabelProps } from '@patternfly/react-core';
import {
  PipelineCoreResourceKF,
  PipelineRecurringRunKF,
  PipelineRunKF,
  RuntimeStateKF,
  runtimeStateLabels,
} from '~/concepts/pipelines/kfTypes';
import { relativeTime } from '~/utilities/time';

export type RunStatusDetails = {
  icon: React.ReactNode;
  label: PipelineRunKF['state'] | string;
  color?: LabelProps['color'];
  status?: React.ComponentProps<typeof Icon>['status'];
  details?: string;
  createdAt?: string;
};

const UNKNOWN_ICON = <QuestionCircleIcon />;
const UNKNOWN_STATUS = 'warning';

export const computeRunStatus = (run?: PipelineRunKF | null): RunStatusDetails => {
  if (!run) {
    return { icon: UNKNOWN_ICON, status: UNKNOWN_STATUS, label: '-' };
  }
  let icon: React.ReactNode;
  let status: React.ComponentProps<typeof Icon>['status'];
  let details: string | undefined;
  let label: string;
  let color: LabelProps['color'];
  const createdAt = relativeTime(Date.now(), new Date(run.created_at).getTime());

  switch (run.state) {
    case RuntimeStateKF.PENDING:
    case RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED:
    case undefined:
      icon = <PendingIcon />;
      label = runtimeStateLabels[RuntimeStateKF.PENDING];
      break;
    case RuntimeStateKF.RUNNING:
      icon = <InProgressIcon />;
      color = 'blue';
      label = runtimeStateLabels[RuntimeStateKF.RUNNING];
      break;
    case RuntimeStateKF.SKIPPED:
      icon = <CheckCircleIcon />;
      label = runtimeStateLabels[RuntimeStateKF.SKIPPED];
      break;
    case RuntimeStateKF.SUCCEEDED:
      icon = <CheckCircleIcon />;
      status = 'success';
      color = 'green';
      label = runtimeStateLabels[RuntimeStateKF.SUCCEEDED];
      break;
    case RuntimeStateKF.FAILED:
      icon = <ExclamationCircleIcon />;
      status = 'danger';
      color = 'red';
      label = runtimeStateLabels[RuntimeStateKF.FAILED];
      details = run.error?.message;
      break;
    case RuntimeStateKF.CANCELING:
      icon = <SyncAltIcon />;
      label = runtimeStateLabels[RuntimeStateKF.CANCELING];
      break;
    case RuntimeStateKF.CANCELED:
      icon = <BanIcon />;
      color = 'gold';
      label = runtimeStateLabels[RuntimeStateKF.CANCELED];
      break;
    case RuntimeStateKF.PAUSED:
      icon = <BanIcon />;
      label = runtimeStateLabels[RuntimeStateKF.PAUSED];
      break;
    default:
      icon = UNKNOWN_ICON;
      status = UNKNOWN_STATUS;
      label = run.state;
      details = run.state;
  }

  return { icon, label, color, status, details, createdAt };
};

export const getPipelineAndVersionDeleteString = (
  resources: PipelineCoreResourceKF[],
  type: 'pipeline' | 'version',
): string => `${resources.length} ${type}${resources.length !== 1 ? 's' : ''}`;

export const getPipelineResourceUniqueID = (resource: PipelineCoreResourceKF): string =>
  resource.display_name + resource.created_at;

export const isPipelineRun = (resource: PipelineCoreResourceKF): resource is PipelineRunKF =>
  'run_id' in resource;

export const isPipelineRecurringRun = (
  resource: PipelineCoreResourceKF,
): resource is PipelineRecurringRunKF => 'recurring_run_id' in resource && !('run_id' in resource);
