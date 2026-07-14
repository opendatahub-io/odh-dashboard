import type { LabelProps } from '@patternfly/react-core';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';

export type PipelineTreeLoadingMode = 'preparing' | 'hydrating';

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

export const PIPELINE_STATUS_LABEL_NO_ICON_CLASS = 'automl-pipeline-status-label--no-icon';

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
    case 'error':
      return { status: 'danger' };
  }
};

export const getPipelineStatusFilterLabel = (
  statusFilter: PipelineStatusFilter,
): PipelineStatusLabel => {
  switch (statusFilter) {
    case 'loading':
      return { text: 'Preparing', ...mapPipelineStatusToLabelAppearance('loading') };
    case 'in-progress':
      return { text: 'In progress', ...mapPipelineStatusToLabelAppearance('in-progress') };
    case 'completed':
      return { text: 'Succeeded', ...mapPipelineStatusToLabelAppearance('completed') };
    case 'error':
      return { text: 'Failed', ...mapPipelineStatusToLabelAppearance('error') };
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
      return { text: 'In progress', ...mapStepStateToLabelAppearance('active') };
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
    case 'error':
      return {
        title: 'Pipeline details',
        variant: 'idle',
        secondaryText: 'Click on any node in the pipeline to view its details here.',
      };
  }
};
