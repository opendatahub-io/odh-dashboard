import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';

export type PipelineLabelColor =
  | 'blue'
  | 'teal'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'orangered'
  | 'grey'
  | 'yellow';

export type PipelineStatusLabel = {
  text: string;
  color: PipelineLabelColor;
};

export const mapPipelineStatusToLabelColor = (status: PipelineStatusFilter): PipelineLabelColor => {
  switch (status) {
    case 'loading':
    case 'in-progress':
      return 'blue';
    case 'completed':
      return 'green';
    case 'error':
      return 'red';
    default:
      return 'grey';
  }
};

export const getPipelineStatusFilterLabel = (
  statusFilter: PipelineStatusFilter,
): PipelineStatusLabel => {
  switch (statusFilter) {
    case 'loading':
      return { text: 'Preparing', color: mapPipelineStatusToLabelColor('loading') };
    case 'in-progress':
      return { text: 'In progress', color: mapPipelineStatusToLabelColor('in-progress') };
    case 'completed':
      return { text: 'Succeeded', color: mapPipelineStatusToLabelColor('completed') };
    case 'error':
      return { text: 'Failed', color: mapPipelineStatusToLabelColor('error') };
  }
};

export const mapStepStateToLabelColor = (
  stepState: TreeNodeData['stepState'],
): PipelineLabelColor => {
  switch (stepState) {
    case 'completed':
      return mapPipelineStatusToLabelColor('completed');
    case 'active':
      return mapPipelineStatusToLabelColor('in-progress');
    case 'failed':
      return mapPipelineStatusToLabelColor('error');
    case 'unreached':
    case 'pending':
    default:
      return 'purple';
  }
};

export const getStepStateLabel = (stepState: TreeNodeData['stepState']): PipelineStatusLabel => {
  switch (stepState) {
    case 'completed':
      return { text: 'Succeeded', color: mapStepStateToLabelColor('completed') };
    case 'active':
      return { text: 'In progress', color: mapStepStateToLabelColor('active') };
    case 'failed':
      return { text: 'Failed', color: mapStepStateToLabelColor('failed') };
    case 'unreached':
    case 'pending':
    default:
      return { text: 'Pending', color: mapStepStateToLabelColor('pending') };
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
