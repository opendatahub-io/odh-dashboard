import { resolveStageLabel, resolveStepLabel } from '~/app/topology/stageMapLabels';

export type StepDetail = {
  label: string;
  value: string;
};

export type StepMetadata = {
  description: string;
  details: StepDetail[];
};

const DEFAULT_DETAILS: StepDetail[] = [{ label: 'Duration', value: '—' }];

const FAILED_STEP_DETAILS: StepDetail[] = [
  { label: 'Template variants', value: '12 candidates evaluated' },
  { label: 'Failed at', value: 'Branch B — template scoring' },
  { label: 'Exit code', value: '1' },
  { label: 'Duration before failure', value: '2 m 14 s' },
];

const FAILED_PRE_BRANCH_DETAILS: StepDetail[] = [
  { label: 'Failed at', value: 'Data preparation output write' },
  { label: 'Exit code', value: '1' },
  { label: 'Duration before failure', value: '1 m 42 s' },
];

const FAILED_PARALLEL_DETAILS: StepDetail[] = [
  { label: 'Failed at', value: 'Model evaluation metric threshold' },
  { label: 'Exit code', value: '1' },
  { label: 'Duration before failure', value: '3 m 08 s' },
];

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

const PRE_BRANCH_DESCRIPTIONS: Record<number, string> = {
  0: STAGE_DESCRIPTIONS.validate_inputs,
  1: STAGE_DESCRIPTIONS.read_and_sample,
  2: STAGE_DESCRIPTIONS.cleanse,
  3: STAGE_DESCRIPTIONS.split,
  4: STAGE_DESCRIPTIONS.write_outputs,
  5: STAGE_DESCRIPTIONS.load_data,
  6: STAGE_DESCRIPTIONS.model_selection,
};

const PARALLEL_STEP_DESCRIPTIONS: Record<number, string> = {
  0: STEP_DESCRIPTIONS.feature_engineering,
  1: STEP_DESCRIPTIONS.model_training,
  2: STEP_DESCRIPTIONS.stacking,
  3: STEP_DESCRIPTIONS.model_evaluation,
};

const POST_BRANCH_DESCRIPTIONS: Record<number, string> = {
  0: STAGE_DESCRIPTIONS.refit_full,
  1: STAGE_DESCRIPTIONS.evaluate_models,
  2: STAGE_DESCRIPTIONS.build_leaderboard,
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

export const getStepMetadata = (
  nodeId: string,
  label: string,
  stepState?: 'completed' | 'active' | 'pending' | 'failed' | 'unreached',
): StepMetadata => {
  const withFailedDetails = (metadata: StepMetadata): StepMetadata => {
    if (stepState !== 'failed') {
      return metadata;
    }
    const stepId = extractStepId(nodeId);
    if (stepId) {
      return {
        ...metadata,
        details: stepId === 'model_evaluation' ? FAILED_PARALLEL_DETAILS : FAILED_STEP_DETAILS,
      };
    }
    const stageId = extractStageId(nodeId);
    if (stageId && !nodeId.includes('__model__')) {
      return { ...metadata, details: FAILED_PRE_BRANCH_DETAILS };
    }
    return { ...metadata, details: FAILED_STEP_DETAILS };
  };

  const stepId = extractStepId(nodeId);
  if (stepId) {
    return withFailedDetails({
      description:
        STEP_DESCRIPTIONS[stepId] ?? `Running ${resolveStepLabel(stepId)} for this model path.`,
      details: DEFAULT_DETAILS,
    });
  }

  if (/^.+__model__branch-\d+$/.test(nodeId)) {
    return withFailedDetails({
      description: `Model training path for ${label}.`,
      details: DEFAULT_DETAILS,
    });
  }

  const stageId = extractStageId(nodeId);
  if (stageId) {
    return withFailedDetails({
      description: STAGE_DESCRIPTIONS[stageId] ?? `Pipeline step: ${resolveStageLabel(stageId)}.`,
      details: DEFAULT_DETAILS,
    });
  }

  // Demo/fallback node ID patterns (when stage map is unavailable)
  const preBranchMatch = /^pre-(\d+)$/.exec(nodeId);
  if (preBranchMatch) {
    const stepIndex = Number(preBranchMatch[1]);
    return withFailedDetails({
      description: PRE_BRANCH_DESCRIPTIONS[stepIndex] ?? `Pipeline step: ${label}.`,
      details: DEFAULT_DETAILS,
    });
  }

  const parallelMatch = /^p\d+-step-(\d+)$/.exec(nodeId);
  if (parallelMatch) {
    const stepIndex = Number(parallelMatch[1]);
    return withFailedDetails({
      description: PARALLEL_STEP_DESCRIPTIONS[stepIndex] ?? `Running ${label} for this model path.`,
      details: DEFAULT_DETAILS,
    });
  }

  const modelMatch = /^p(\d+)-model$/.exec(nodeId);
  if (modelMatch) {
    const pathIndex = Number(modelMatch[1]);
    if (pathIndex === 2 && stepState !== 'failed') {
      return {
        description: 'Final pattern selection and deployment preparation.',
        details: [
          { label: 'Selected pattern', value: 'Pattern 2 (teal branch)' },
          { label: 'Final score', value: '0.831' },
          { label: 'Ready for deployment', value: 'Yes' },
        ],
      };
    }
    return withFailedDetails({
      description: `Model training path for ${label}.`,
      details: DEFAULT_DETAILS,
    });
  }

  const postBranchMatch = /^final-(\d+)$/.exec(nodeId);
  if (postBranchMatch) {
    const stepIndex = Number(postBranchMatch[1]);
    return withFailedDetails({
      description: POST_BRANCH_DESCRIPTIONS[stepIndex] ?? `Pipeline step: ${label}.`,
      details: DEFAULT_DETAILS,
    });
  }

  return withFailedDetails({
    description: `Pipeline step: ${label}.`,
    details: DEFAULT_DETAILS,
  });
};
