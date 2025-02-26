export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  BASE_MODEL = 'fine-tune-section-base-model',
  RUN_TYPE = 'fine-tune-section-run-type',
  HYPERPARAMETERS = 'fun-tune-hyperparameters',
}

export const fineTunePageSectionTitles: Record<FineTunePageSections, string> = {
  [FineTunePageSections.PROJECT_DETAILS]: 'Project details',
  [FineTunePageSections.BASE_MODEL]: 'Base model',
  [FineTunePageSections.RUN_TYPE]: 'Run Type',
  [FineTunePageSections.HYPERPARAMETERS]: 'Hyperparameters',
};

export const fineTunePageSectionDescriptions: Record<FineTunePageSections, string> = {
  [FineTunePageSections.PROJECT_DETAILS]: 'This project is used for running your pipeline',
  [FineTunePageSections.RUN_TYPE]:
    'Select the type of run you want to start based on your use case. Simple runs are best for iterating, and full runs are best for creating production-ready models.',
  [FineTunePageSections.HYPERPARAMETERS]: 'Configure advanced settings for this run.',
  [FineTunePageSections.BASE_MODEL]: '',
};

export const ILAB_PIPELINE_NAME = 'instructlab';

export const BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY = 'baseModelInputStorageLocationUri';

export enum RunTypeFormat {
  FULL = 'Full',
  SIMPLE = 'Simple',
}

export enum HyperparameterFields {
  SDG_SAMPLE_SIZE = 'sdg_sample_size',
  SDG_SCALE_FACTOR = 'sdg_scale_factor',
  MAXIMUM_TOKENS_PER_ACCELERATOR = 'train_max_batch_len',
  TRAINING_WORKERS = 'train_nnodes',
  TRAIN_NUM_EPOCHS_PHASE_1 = 'train_num_epochs_phase_1',
  TRAIN_NUM_EPOCHS_PHASE_2 = 'train_num_epochs_phase_2',
  BATCH_SIZE_PHASE_1 = 'train_effective_batch_size_phase_1',
  BATCH_SIZE_PHASE_2 = 'train_effective_batch_size_phase_2',
  LEARNING_RATE_PHASE_1 = 'train_learning_rate_phase_1',
  LEARNING_RATE_PHASE_2 = 'train_learning_rate_phase_2',
  WARMUP_STEPS_PHASE_1 = 'train_num_warmup_steps_phase_1',
  WARMUP_STEPS_PHASE_2 = 'train_num_warmup_steps_phase_2',
  MAXIMUM_BATCH_LENGTH = 'sdg_max_batch_len',
  TRAINING_SEED = 'train_seed',
  QUESTION_ANSWER_PAIRS = 'final_eval_few_shots',
  EVALUATION_WORKERS = 'final_eval_max_workers',
  EVALUATION_BATCH_SIZE = 'final_eval_batch_size',
}

export const HYPERPARAMETER_DISPLAY_NAMES: Record<HyperparameterFields, string> = {
  [HyperparameterFields.SDG_SCALE_FACTOR]: 'SDG scale factor',
  [HyperparameterFields.MAXIMUM_TOKENS_PER_ACCELERATOR]: 'Maximum tokens per accelerator',
  [HyperparameterFields.SDG_SAMPLE_SIZE]: 'SDG skill recipe sample size',
  [HyperparameterFields.TRAINING_WORKERS]: 'Training workers',
  [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_1]: 'Epochs (phase 1)',
  [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_2]: 'Epochs (phase 2)',
  [HyperparameterFields.BATCH_SIZE_PHASE_1]: 'Batch size (phase 1)',
  [HyperparameterFields.BATCH_SIZE_PHASE_2]: 'Batch size (phase 2)',
  [HyperparameterFields.LEARNING_RATE_PHASE_1]: 'Learning rate (phase 1)',
  [HyperparameterFields.LEARNING_RATE_PHASE_2]: 'Learning rate (phase 2)',
  [HyperparameterFields.WARMUP_STEPS_PHASE_1]: 'Warmup steps (phase 1)',
  [HyperparameterFields.WARMUP_STEPS_PHASE_2]: 'Warmup steps (phase 2)',
  [HyperparameterFields.MAXIMUM_BATCH_LENGTH]: 'Maximum batch length',
  [HyperparameterFields.TRAINING_SEED]: 'Training seed',
  [HyperparameterFields.QUESTION_ANSWER_PAIRS]: 'Question-answer pairs',
  [HyperparameterFields.EVALUATION_WORKERS]: 'Evaluation workers',
  [HyperparameterFields.EVALUATION_BATCH_SIZE]: 'Evaluation batch size',
};

export const RunTypeFormatDescriptions: Record<RunTypeFormat, string> = {
  [RunTypeFormat.FULL]:
    'This run type has a larger synthetic data generation step, requires more time and resources, and is best for producing high-quality results.',
  [RunTypeFormat.SIMPLE]:
    'This run type has a smaller synthetic data generation step, requires less tie and resources, and is best for quickly testign and iterating.',
};

export const HYPERPARAMETER_LIST = [
  HyperparameterFields.SDG_SCALE_FACTOR,
  HyperparameterFields.MAXIMUM_TOKENS_PER_ACCELERATOR,
  HyperparameterFields.SDG_SAMPLE_SIZE,
  HyperparameterFields.TRAINING_WORKERS,
  HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_1,
  HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_2,
  HyperparameterFields.BATCH_SIZE_PHASE_1,
  HyperparameterFields.BATCH_SIZE_PHASE_2,
  HyperparameterFields.LEARNING_RATE_PHASE_1,
  HyperparameterFields.LEARNING_RATE_PHASE_2,
  HyperparameterFields.WARMUP_STEPS_PHASE_1,
  HyperparameterFields.WARMUP_STEPS_PHASE_2,
  HyperparameterFields.MAXIMUM_BATCH_LENGTH,
  HyperparameterFields.TRAINING_SEED,
  HyperparameterFields.QUESTION_ANSWER_PAIRS,
  HyperparameterFields.EVALUATION_WORKERS,
  HyperparameterFields.EVALUATION_BATCH_SIZE,
];
