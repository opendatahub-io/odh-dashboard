import type { LabelProps } from '@patternfly/react-core';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { normalizePipelineRunState } from '~/app/utilities/utils';

export type PipelineTreeLoadingMode = 'preparing' | 'hydrating';

/** Maps a validated KFP run state to the visualization status filter. */
export const getDefaultStatusFilter = (runState?: string): PipelineStatusFilter => {
  const upper = normalizePipelineRunState(runState);
  if (!upper) {
    return 'loading';
  }
  if (
    upper === RuntimeStateKF.RUNNING ||
    upper === RuntimeStateKF.PENDING ||
    upper === RuntimeStateKF.PAUSED ||
    upper === RuntimeStateKF.CANCELING
  ) {
    return 'in-progress';
  }
  if (upper === RuntimeStateKF.SUCCEEDED) {
    return 'completed';
  }
  if (upper === RuntimeStateKF.FAILED) {
    return 'error';
  }
  if (upper === RuntimeStateKF.CANCELED) {
    return 'canceled';
  }
  return 'loading';
};

export type PipelineTreeLoadingContent = {
  title: string;
  primaryText: string;
  secondaryText: string;
};

export const getPipelineTreeLoadingContent = (
  mode: PipelineTreeLoadingMode,
): PipelineTreeLoadingContent => {
  switch (mode) {
    case 'preparing':
      return {
        title: 'Preparing pipeline',
        primaryText: 'Starting your evaluation, this may take a few moments',
        secondaryText: 'The pipeline visualization will appear when the run structure is ready.',
      };
    case 'hydrating':
    default:
      return {
        title: 'Loading run details',
        primaryText: 'Loading run details',
        secondaryText:
          'The pipeline visualization will appear once the current run data is retrieved.',
      };
  }
};

export type PipelineLabelAppearance =
  | { status: NonNullable<LabelProps['status']> }
  | { color: NonNullable<LabelProps['color']> };

export type PipelineStatusLabel = { text: string } & PipelineLabelAppearance;

export const PIPELINE_STATUS_LABEL_NO_ICON_CLASS = 'autorag-pipeline-status-label--no-icon';

export const getPipelineStatusLabelProps = (
  label: PipelineLabelAppearance,
): Pick<LabelProps, 'color' | 'status'> & { className?: string } => {
  if ('status' in label) {
    return { status: label.status, className: PIPELINE_STATUS_LABEL_NO_ICON_CLASS };
  }
  return { color: label.color };
};

export const mapPipelineStatusToLabelAppearance = (
  status: PipelineStatusFilter,
): PipelineLabelAppearance => {
  switch (status) {
    case 'loading':
    case 'in-progress':
      return { color: 'blue' };
    case 'completed':
      return { status: 'success' };
    case 'canceled':
      return { status: 'warning' };
    case 'error':
      return { status: 'danger' };
    default:
      return { color: 'purple' };
  }
};

export const getPipelineStatusFilterLabel = (
  statusFilter: PipelineStatusFilter,
): PipelineStatusLabel => {
  switch (statusFilter) {
    case 'loading':
      return { text: 'Preparing', ...mapPipelineStatusToLabelAppearance('loading') };
    case 'in-progress':
      return { text: 'Running', ...mapPipelineStatusToLabelAppearance('in-progress') };
    case 'completed':
      return { text: 'Succeeded', ...mapPipelineStatusToLabelAppearance('completed') };
    case 'canceled':
      return { text: 'Canceled', ...mapPipelineStatusToLabelAppearance('canceled') };
    case 'error':
      return { text: 'Failed', ...mapPipelineStatusToLabelAppearance('error') };
    default:
      return { text: 'Loading', ...mapPipelineStatusToLabelAppearance('loading') };
  }
};

export const mapStepStateToLabelAppearance = (
  stepState: TreeNodeData['stepState'],
): PipelineLabelAppearance => {
  switch (stepState) {
    case 'completed':
      return mapPipelineStatusToLabelAppearance('completed');
    case 'active':
      return mapPipelineStatusToLabelAppearance('in-progress');
    case 'failed':
      return mapPipelineStatusToLabelAppearance('error');
    case 'unreached':
    case 'pending':
    default:
      return { color: 'purple' };
  }
};

export const getStepStateLabel = (stepState: TreeNodeData['stepState']): PipelineStatusLabel => {
  switch (stepState) {
    case 'completed':
      return { text: 'Succeeded', ...mapStepStateToLabelAppearance('completed') };
    case 'active':
      return { text: 'Running', ...mapStepStateToLabelAppearance('active') };
    case 'failed':
      return { text: 'Failed', ...mapStepStateToLabelAppearance('failed') };
    case 'unreached':
    case 'pending':
    default:
      return { text: 'Pending', ...mapStepStateToLabelAppearance('pending') };
  }
};

export type PipelineDetailsEmptyContent = {
  title: string;
  variant: 'loading' | 'idle';
  primaryText?: string;
  secondaryText?: string;
};

export const getPipelineDetailsEmptyContent = (
  statusFilter: PipelineStatusFilter,
): PipelineDetailsEmptyContent => {
  switch (statusFilter) {
    case 'loading':
      return {
        title: 'Preparing pipeline',
        variant: 'loading',
        primaryText: 'Preparing pipeline',
        secondaryText: 'Pipeline steps will appear on the left once the run structure is ready.',
      };
    case 'in-progress':
      return {
        title: 'Running pipeline',
        variant: 'loading',
        primaryText: 'Running pipeline',
        secondaryText: 'Details will appear once the step is complete.',
      };
    case 'completed':
    case 'canceled':
    case 'error':
    default:
      return {
        title: 'Pipeline details',
        variant: 'idle',
        secondaryText: 'Click on any node in the pipeline to view its details here.',
      };
  }
};
