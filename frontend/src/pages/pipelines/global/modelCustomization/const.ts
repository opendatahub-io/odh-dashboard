export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  TAXONOMY_DETAILS = 'fine-tune-section-taxonomy-details',
  BASE_MODEL = 'fine-tune-section-base-model',
  TEACHER_MODEL = 'fine-tune-section-teacher-model',
  JUDGE_MODEL = 'fine-tune-section-judge-model',
  RUN_TYPE = 'fine-tune-section-run-type',
  HYPERPARAMETERS = 'fun-tune-hyperparameters',
}

export const fineTunePageSectionTitles: Record<FineTunePageSections, string> = {
  [FineTunePageSections.PROJECT_DETAILS]: 'Project details',
  [FineTunePageSections.TAXONOMY_DETAILS]: 'Taxonomy details',
  [FineTunePageSections.BASE_MODEL]: 'Base model',
  [FineTunePageSections.TEACHER_MODEL]: 'Teacher model',
  [FineTunePageSections.JUDGE_MODEL]: 'Judge model',
  [FineTunePageSections.RUN_TYPE]: 'Run type',
  [FineTunePageSections.HYPERPARAMETERS]: 'Hyperparameters',
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
  TRAINING_WORKERS = 'train_num_workers',
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
  TRAIN_SAVE_SAMPLES = 'train_save_samples',
  MT_BENCH_MAX_WORKERS = 'mt_bench_max_workers',
  MT_BENCH_MERGE_SYSTEM_USER_MESSAGE = 'mt_bench_merge_system_user_message',
  FINAL_EVAL_MERGE_SYSEM_USE_MESSAGE = 'final_eval_merge_system_user_message',
  SDG_REPO_PR = 'sdg_repo_pr',
  SDG_PIPELINE = 'sdg_pipeline',
  K8S_STORAGE_CLASS_NAME = 'k8s_storage_class_name',
}

export const RunTypeFormatDescriptions: Record<RunTypeFormat, string> = {
  [RunTypeFormat.FULL]:
    'This run type has a larger synthetic data generation step, requires more time and resources, and is best for producing high-quality results.',
  [RunTypeFormat.SIMPLE]:
    'This run type has a smaller synthetic data generation step, requires less time and resources, and is best for quickly testing and iterating.',
};

export const HYPERPARAMETER_LONG_NUMBER_LIST = [
  HyperparameterFields.LEARNING_RATE_PHASE_1,
  HyperparameterFields.LEARNING_RATE_PHASE_2,
];

export const HYPERPARAMETER_EVALUATION_LIST = [
  HyperparameterFields.EVALUATION_WORKERS,
  HyperparameterFields.EVALUATION_BATCH_SIZE,
];
