/* eslint-disable camelcase -- keys match backend stage IDs */

export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  validate_inputs: 'Validate inputs',
  read_and_sample: 'Read and sample data',
  cleanse: 'Cleanse data',
  split: 'Split data',
  split_and_export: 'Split data',
  write_outputs: 'Write outputs',
  prepare_data: 'Prepare data',
  load_data: 'Load data',
  model_selection: 'Select models',
  refit_full: 'Refit and evaluate',
  evaluate_models: 'Evaluate models',
  build_leaderboard: 'Build leaderboard',
};

export const STEP_DISPLAY_NAMES: Record<string, string> = {
  feature_engineering: 'Engineer features',
  model_training: 'Train model',
  stacking: 'Stack predictions',
  model_evaluation: 'Evaluate results',
  evaluation: 'Evaluate results',
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
