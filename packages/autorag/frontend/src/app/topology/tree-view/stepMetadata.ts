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
  download_and_sample:
    'Downloading the source documents and sampling a representative subset for evaluation.',
  prepare_data: 'Preparing and sampling the input dataset for the optimization run.',
  write_output: 'Writing intermediate outputs from the data preparation phase.',
  list_and_sample:
    'Listing the available documents and sampling a subset to build the evaluation set.',
  write_descriptor: 'Writing the document descriptor used to track downstream processing.',
  load_descriptor: 'Loading the document descriptor to resume processing.',
  extract_documents: 'Extracting and parsing document content for indexing and evaluation.',
  prepare_search_space:
    'Preparing the search space of chunking, embedding, retrieval, and generation options to explore.',
  write_report: 'Writing the evaluation report summarizing pipeline results.',
  optimize_templates:
    'Evaluating candidate RAG pattern configurations and selecting the top performers to run in parallel.',
  run_optimization:
    'Running each candidate pattern through the RAG pipeline and scoring its responses.',
  write_patterns: 'Writing the evaluated pattern configurations and their scores.',
  build_requests: 'Building the request payloads used to query the RAG pipeline for each pattern.',
  write_artifacts: 'Writing pattern artifacts such as notebooks and configuration files.',
  build_leaderboard: 'Building the leaderboard and ranking patterns by their optimized metric.',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  chunking: 'Splitting source documents into chunks for indexing.',
  embedding: 'Generating vector embeddings for each chunk.',
  retrieval: 'Retrieving the most relevant chunks for a given query.',
  generation: 'Generating an answer from the retrieved context.',
  evaluation: 'Evaluating the generated answer against the evaluation dataset.',
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
        `Running ${resolveStepLabel(stepId)} for this pattern path.`,
      details: DEFAULT_DETAILS,
    });
  }

  if (/^.+__pattern__branch-\d+$/.test(nodeId)) {
    return resolveMetadata({
      description: `Pattern path for ${label}.`,
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
