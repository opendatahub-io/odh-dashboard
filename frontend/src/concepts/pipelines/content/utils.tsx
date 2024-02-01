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
  PipelineCoreResourceKF,
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineRunStatusesKF,
  PipelineVersionKF,
  RelationshipKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';

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

export const isPipelineRunJob = (
  runOrJob?: PipelineRunJobKF | PipelineRunKF,
): runOrJob is PipelineRunJobKF => !!(runOrJob as PipelineRunJobKF)?.trigger;

export const getPipelineIdByPipelineVersion = (
  version: PipelineVersionKF | null,
): string | undefined =>
  version?.resource_references.find(
    (ref) => ref.relationship === RelationshipKF.OWNER && ref.key.type === ResourceTypeKF.PIPELINE,
  )?.key.id;

export const getPipelineAndVersionDeleteString = (
  resources: PipelineCoreResourceKF[],
  type: 'pipeline' | 'version',
): string => `${resources.length} ${type}${resources.length !== 1 ? 's' : ''}`;
