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
} from '#~/concepts/pipelines/kfTypes';
import { getTimeRangeCategory, relativeTime } from '#~/utilities/time';
import { StatusType } from '#~/concepts/pipelines/content/PipelineComponentStatusIcon.tsx';
import { K8sCondition, K8sDspaConditionReason } from '#~/k8sTypes.ts';

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
      color = 'orangered';
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

// workaround until https://issues.redhat.com/browse/RHOAIENG-27727 is fixed
// (created to track the above issue: https://issues.redhat.com/browse/RHOAIENG-28144)
// after the above ticket is resolved, once 'failingTodeploy' is detected then it is an automatic fail
// without any need for a timeout.
// but we should still timeout everything else
export const getStatusFromCondition = (condition: K8sCondition): StatusType => {
  const { reason, status, lastTransitionTime } = condition;
  if (status === 'True') {
    return StatusType.SUCCESS;
  }
  if (reason === K8sDspaConditionReason.Deploying && status === 'False') {
    return StatusType.IN_PROGRESS;
  }

  if (
    reason === K8sDspaConditionReason.ComponentDeploymentNotFound ||
    reason === K8sDspaConditionReason.UnsupportedVersion
  ) {
    return StatusType.ERROR;
  }

  // For all other non-true statuses, apply timeout logic
  // after bug above is addressed/fixed; add K8sDspaConditionReason.FailingToDeploy to the immediate error clause above
  const rangeType = getTimeRangeCategory(lastTransitionTime);
  switch (rangeType) {
    case 'shortRange':
      return StatusType.PENDING;
    case 'mediumRange':
      return StatusType.WARNING;
    case 'longRange':
      return StatusType.ERROR;
  }
};

const CONDITION_TO_MESSAGE: Record<string, string> = {
  DatabaseAvailable: 'Connect to database',
  ObjectStoreAvailable: 'Connect to storage',
  PersistenceAgentReady: 'Start Persistence Agent',
  ApiServerReady: 'Start API server',
  ScheduledWorkflowReady: 'Schedule workflow',
  WorkflowControllerReady: 'Start workflow controller',
  MLMDProxyReady: 'Start metadata proxy',
  WebhookReady: 'Start webhook',
  Ready: 'Start pipeline Server',
};

// Fallback: strip trailing "Ready"/"Available", un-camel the rest, and prefix "Start "
const fallbackMessage = (raw: string): string => {
  // 1) remove trailing "Ready" or "Available" (case-insensitive)
  const base = raw.replace(/(?:Ready|Available)$/i, '');

  // 2) split PascalCase/camelCase and acronyms; also handle snake/kebab just in case
  const spaced = base
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2') // aB -> a B
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ABCd -> ABC d
    .trim();

  // 3) lowercase normal words but keep full acronyms (e.g., MLMD) as-is
  const normalized = spaced
    .split(/\s+/)
    .map((w) => (w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ');

  return `Start ${normalized}`;
};

// Main accessor: use table, else fallback
export const messageForCondition = (raw: string): string =>
  CONDITION_TO_MESSAGE[raw] ?? fallbackMessage(raw);
