/* eslint-disable camelcase -- keys match backend stage IDs */

export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  validate_inputs: 'Validate inputs',
  download_and_sample: 'Download and sample',
  prepare_data: 'Prepare data',
  write_output: 'Write output',
  list_and_sample: 'List and sample',
  write_descriptor: 'Write descriptor',
  load_descriptor: 'Load descriptor',
  extract_documents: 'Extract documents',
  prepare_search_space: 'Prepare search space',
  write_report: 'Write report',
  optimize_templates: 'Optimize templates',
  run_optimization: 'Run optimization',
  write_patterns: 'Write patterns',
  build_requests: 'Build requests',
  write_artifacts: 'Write artifacts',
  build_leaderboard: 'Build leaderboard',
};

export const STEP_DISPLAY_NAMES: Record<string, string> = {
  chunking: 'Chunking',
  embedding: 'Embedding',
  retrieval: 'Retrieval',
  generation: 'Generation',
  evaluation: 'Evaluation',
};

const fallbackStageLabel = (stageId: string): string => {
  const spaced = stageId.replace(/[-_]+/g, ' ').trim();
  if (!spaced) {
    return stageId;
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export const resolveStageLabel = (stageId: string): string =>
  Object.hasOwn(STAGE_DISPLAY_NAMES, stageId)
    ? STAGE_DISPLAY_NAMES[stageId]
    : fallbackStageLabel(stageId);

export const resolveStepLabel = (stepId: string): string =>
  Object.hasOwn(STEP_DISPLAY_NAMES, stepId)
    ? STEP_DISPLAY_NAMES[stepId]
    : fallbackStageLabel(stepId);

/* eslint-enable camelcase */
