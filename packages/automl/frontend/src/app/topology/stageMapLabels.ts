/* eslint-disable camelcase -- keys match backend stage IDs */

export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  validate_inputs: 'Validate inputs',
  read_and_sample: 'Read and sample data',
  cleanse: 'Cleanse data',
  split: 'Split data',
  write_outputs: 'Write outputs',
  load_data: 'Load data',
  model_selection: 'Model selection',
  refit_full: 'Refit models',
  evaluate_models: 'Evaluate models',
  build_leaderboard: 'Build leaderboard',
};

export const STEP_DISPLAY_NAMES: Record<string, string> = {
  feature_engineering: 'Feature engineering',
  model_training: 'Model training',
  stacking: 'Stacking',
  model_evaluation: 'Model evaluation',
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
