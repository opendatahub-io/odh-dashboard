import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import {
  componentIdToTaskId,
  findComponentTaskInRunDetails,
} from '~/app/hooks/useComponentStatuses';
import type { PipelineRun, PipelineRunTaskDetail } from '~/app/types';
import { resolveStageLabel, resolveStepLabel } from '~/app/topology/stageMapLabels';
import { formatDurationBetween } from '~/app/utilities/utils';
import {
  getStageDescriptionFromMap,
  getStageMapDetails,
  parseStageMapNodeId,
} from './stageMapStepMetadata';

export type StepDetail = {
  label: string;
  value: string;
};

export type StepMetadata = {
  description: string;
  details: StepDetail[];
};

const DEFAULT_DETAILS: StepDetail[] = [{ label: 'Duration', value: '—' }];

/* eslint-disable camelcase -- keys match backend stage IDs */
const STAGE_DESCRIPTIONS: Record<string, string> = {
  validate_inputs: 'Validating pipeline inputs and configuration before processing begins.',
  read_and_sample: 'Reading the dataset and sampling a representative subset for training.',
  cleanse: 'Cleaning and transforming raw data to prepare it for modeling.',
  split: 'Splitting data into training and holdout sets.',
  write_outputs: 'Writing intermediate outputs from the data preparation phase.',
  load_data: 'Loading prepared data for model training.',
  model_selection:
    'Evaluating candidate model families and selecting the top performers to train in parallel.',
  refit_full: 'Retraining the best-performing models on the full training dataset.',
  evaluate_models: 'Evaluating model performance on the holdout test set using configured metrics.',
  build_leaderboard: 'Building the leaderboard and selecting the best model for deployment.',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  feature_engineering: 'Engineering and selecting features for the model training pipeline.',
  model_training: 'Training base models with default hyperparameters.',
  stacking: 'Building stacked ensembles from trained base models.',
  model_evaluation: 'Evaluating model performance for this training path.',
};
/* eslint-enable camelcase */

const extractStageId = (nodeId: string): string | undefined => {
  const parts = nodeId.split('__');
  const last = parts[parts.length - 1];
  if (!last || last.startsWith('branch-')) {
    return undefined;
  }
  return last;
};

const extractStepId = (nodeId: string): string | undefined => {
  const match = /^.+__step__(.+)__branch-\d+$/.exec(nodeId);
  return match?.[1];
};

/** Find matching KFP task timing for a fallback topology node id. */
const findTaskDetailForNode = (
  nodeId: string,
  pipelineRun?: PipelineRun,
): PipelineRunTaskDetail | undefined => {
  const taskDetails = pipelineRun?.run_details?.task_details;
  if (!taskDetails?.length) {
    return undefined;
  }

  // Prefer the executor task, including KFP branch-suffixed names (e.g. `-2`).
  const executorTask = findComponentTaskInRunDetails(taskDetails, nodeId);
  if (executorTask) {
    return executorTask;
  }

  // Fall back to the matching driver task when no executor is present.
  const driverTaskId = `${componentIdToTaskId(nodeId)}-driver`;
  return taskDetails.find((task) =>
    [task.task_id, task.display_name].some((name): name is string => name === driverTaskId),
  );
};

const getDetailsFromPipelineRun = (nodeId: string, pipelineRun?: PipelineRun): StepDetail[] => {
  const task = findTaskDetailForNode(nodeId, pipelineRun);
  if (!task) {
    return DEFAULT_DETAILS;
  }

  const duration = formatDurationBetween(task.start_time ?? task.create_time, task.end_time);
  const details: StepDetail[] = [{ label: 'Duration', value: duration ?? '—' }];

  if (task.error?.message) {
    details.push({ label: 'Error', value: task.error.message });
  }

  return details;
};

export type StepMetadataContext = {
  componentStageMap?: ComponentStageMap;
  pipelineRun?: PipelineRun;
};

export const getStepMetadata = (
  nodeId: string,
  label: string,
  stepState?: 'completed' | 'active' | 'pending' | 'failed' | 'unreached',
  context?: StepMetadataContext,
): StepMetadata => {
  const enrichWithStageMap = (metadata: StepMetadata): StepMetadata => {
    const { componentStageMap, pipelineRun } = context ?? {};
    if (!componentStageMap) {
      return {
        ...metadata,
        details: getDetailsFromPipelineRun(nodeId, pipelineRun),
      };
    }

    const parsed = parseStageMapNodeId(nodeId);
    if (!parsed) {
      return {
        ...metadata,
        details: getDetailsFromPipelineRun(nodeId, pipelineRun),
      };
    }

    const mapDetails = getStageMapDetails(parsed, componentStageMap, pipelineRun, label, stepState);
    if (!mapDetails) {
      return {
        description: getStageDescriptionFromMap(parsed, componentStageMap) ?? metadata.description,
        details: getDetailsFromPipelineRun(parsed.componentId, pipelineRun),
      };
    }

    const mapDescription = getStageDescriptionFromMap(parsed, componentStageMap);
    const hasStageMapError = mapDetails.some((detail) => detail.label === 'Error');
    let details = mapDetails;

    if (!hasStageMapError && pipelineRun && stepState === 'failed') {
      const task = findComponentTaskInRunDetails(
        pipelineRun.run_details?.task_details ?? [],
        parsed.componentId,
      );
      if (task?.error?.message) {
        details = [...mapDetails, { label: 'Error', value: task.error.message }];
      }
    }

    return {
      description: mapDescription ?? metadata.description,
      details,
    };
  };

  /** Prefer stage-map details; otherwise use task timing/errors from the pipeline run when available. */
  const resolveMetadata = (metadata: StepMetadata): StepMetadata => {
    if (context?.componentStageMap) {
      return enrichWithStageMap(metadata);
    }

    return {
      ...metadata,
      details: getDetailsFromPipelineRun(nodeId, context?.pipelineRun),
    };
  };

  const stepId = extractStepId(nodeId);
  if (stepId) {
    return resolveMetadata({
      description:
        (Object.hasOwn(STEP_DESCRIPTIONS, stepId) ? STEP_DESCRIPTIONS[stepId] : undefined) ??
        `Running ${resolveStepLabel(stepId)} for this model path.`,
      details: DEFAULT_DETAILS,
    });
  }

  if (/^.+__model__branch-\d+$/.test(nodeId)) {
    return resolveMetadata({
      description: `Model training path for ${label}.`,
      details: DEFAULT_DETAILS,
    });
  }

  const stageId = extractStageId(nodeId);
  if (stageId) {
    return resolveMetadata({
      description:
        (Object.hasOwn(STAGE_DESCRIPTIONS, stageId) ? STAGE_DESCRIPTIONS[stageId] : undefined) ??
        `Pipeline step: ${resolveStageLabel(stageId)}.`,
      details: DEFAULT_DETAILS,
    });
  }

  return resolveMetadata({
    description: `Pipeline step: ${label}.`,
    details: DEFAULT_DETAILS,
  });
};
