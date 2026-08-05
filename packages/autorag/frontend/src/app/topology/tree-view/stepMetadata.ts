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
  load_benchmark: 'Loading the benchmark and metrics configuration.',
  discover_documents: 'Scanning knowledge sources for documents.',
  extract_documents: 'Extracting and normalizing document content.',
  prepare_search_space: 'Chunking documents and indexing embeddings in the vector store.',
  write_report: 'Writing the evaluation report summarizing pipeline results.',
  optimize_templates:
    'Testing prompt templates across parallel branches. Branch steps will show as pending until all branches complete.',
  run_optimization:
    'Running each candidate pattern through the RAG pipeline and scoring its responses.',
  write_patterns: 'Writing the evaluated pattern configurations and their scores.',
  build_requests: 'Building the request payloads used to query the RAG pipeline for each pattern.',
  write_artifacts: 'Writing pattern artifacts such as notebooks and configuration files.',
  build_leaderboard: 'Selecting the best-performing pattern for deployment.',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  chunking: 'Splitting source documents into chunks for indexing.',
  embedding: 'Generating vector embeddings for each chunk.',
  retrieval: 'Retrieving the most relevant chunks for a given query.',
  generation: 'Generating an answer from the retrieved context.',
  evaluation: 'Comprehensive evaluation of the final pattern using holdout test data.',
};
/* eslint-enable camelcase */

const getCuratedDescription = (nodeId: string): string | undefined => {
  const parsed = parseStageMapNodeId(nodeId);
  if (parsed?.type === 'stage' && Object.hasOwn(STAGE_DESCRIPTIONS, parsed.stageId)) {
    return STAGE_DESCRIPTIONS[parsed.stageId];
  }
  if (parsed?.type === 'branch_step' && Object.hasOwn(STEP_DESCRIPTIONS, parsed.stepId)) {
    return STEP_DESCRIPTIONS[parsed.stepId];
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
    const curatedDescription = getCuratedDescription(nodeId);
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
        getCuratedDescription(nodeId) ??
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
      description: getCuratedDescription(nodeId) ?? `Pipeline step: ${resolveStageLabel(stageId)}.`,
      details: DEFAULT_DETAILS,
    });
  }

  return resolveMetadata({
    description: `Pipeline step: ${label}.`,
    details: DEFAULT_DETAILS,
  });
};
