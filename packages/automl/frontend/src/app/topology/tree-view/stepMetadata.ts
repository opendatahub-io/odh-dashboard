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
  /** Optional popover help shown next to the label. */
  help?: { header: string; body: string };
};

export type StepMetadata = {
  description: string;
  details: StepDetail[];
};

const DEFAULT_DETAILS: StepDetail[] = [{ label: 'Duration', value: '—' }];

const BRANCH_MODEL_DESCRIPTION = 'The trained model candidate and its configuration.';

/* eslint-disable camelcase -- keys match backend stage IDs */
const STAGE_DESCRIPTIONS: Record<string, string> = {
  validate_inputs: 'Validating pipeline inputs and configuration before processing begins.',
  read_and_sample: 'Reading the dataset and sampling a representative subset for training.',
  cleanse: 'Cleaning and transforming raw data to prepare it for modeling.',
  prepare_data: 'Validating and preprocessing input data for training.',
  split: 'Splitting data into training and test sets for model evaluation.',
  split_and_export: 'Splitting data into training and test sets for model evaluation.',
  write_outputs: 'Writing intermediate outputs from the data preparation phase.',
  load_data: 'Loading prepared data into the training workspace.',
  model_selection: 'Selecting candidate model architectures to train and evaluate.',
  refit_full: 'Retraining top models using the complete dataset and evaluating final performance.',
  evaluate_models: 'Evaluating model performance on the holdout test set using configured metrics.',
  build_leaderboard: 'Ranking models by performance and generating the results leaderboard.',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  feature_engineering: 'Transforming raw data into features for model training.',
  model_training: 'Training the model using the prepared training data.',
  stacking: 'Combining predictions from multiple models to improve accuracy.',
  model_evaluation: 'Evaluating model performance against the test set.',
  evaluation: 'Evaluating model performance against the test set.',
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

const getCuratedDescription = (nodeId: string): string | undefined => {
  const parsed = parseStageMapNodeId(nodeId);
  if (parsed?.type === 'stage' && Object.hasOwn(STAGE_DESCRIPTIONS, parsed.stageId)) {
    return STAGE_DESCRIPTIONS[parsed.stageId];
  }
  if (parsed?.type === 'branch_step' && Object.hasOwn(STEP_DESCRIPTIONS, parsed.stepId)) {
    return STEP_DESCRIPTIONS[parsed.stepId];
  }
  if (parsed?.type === 'branch_model') {
    return BRANCH_MODEL_DESCRIPTION;
  }

  const stepId = extractStepId(nodeId);
  if (stepId && Object.hasOwn(STEP_DESCRIPTIONS, stepId)) {
    return STEP_DESCRIPTIONS[stepId];
  }

  const stageId = extractStageId(nodeId);
  if (stageId && Object.hasOwn(STAGE_DESCRIPTIONS, stageId)) {
    return STAGE_DESCRIPTIONS[stageId];
  }

  return undefined;
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

    const curatedDescription = getCuratedDescription(nodeId);
    const mapDetails = getStageMapDetails(parsed, componentStageMap, pipelineRun, label, stepState);
    if (!mapDetails) {
      return {
        description:
          curatedDescription ??
          getStageDescriptionFromMap(parsed, componentStageMap) ??
          metadata.description,
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
      description: curatedDescription ?? mapDescription ?? metadata.description,
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
        getCuratedDescription(nodeId) ?? `Running ${resolveStepLabel(stepId)} for this model path.`,
      details: DEFAULT_DETAILS,
    });
  }

  if (/^.+__model__branch-\d+$/.test(nodeId)) {
    return resolveMetadata({
      description: getCuratedDescription(nodeId) ?? BRANCH_MODEL_DESCRIPTION,
      details: DEFAULT_DETAILS,
    });
  }

  const stageId = extractStageId(nodeId);
  if (stageId) {
    return resolveMetadata({
      description: getCuratedDescription(nodeId) ?? `Pipeline step: ${resolveStageLabel(stageId)}.`,
      details: DEFAULT_DETAILS,
    });
  }

  return resolveMetadata({
    description: `Pipeline step: ${label}.`,
    details: DEFAULT_DETAILS,
  });
};
