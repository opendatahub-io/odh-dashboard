export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  TAXONOMY_DETAILS = 'fine-tune-section-taxonomy-details',
  PIPELINE_DETAILS = 'fine-tine-section-pipeline-details',
  BASE_MODEL = 'fine-tune-section-base-model',
  TEACHER_MODEL = 'fine-tune-section-teacher-model',
  JUDGE_MODEL = 'fine-tune-section-judge-model',
  TRAINING_HARDWARE = 'fine-tune-section-training-hardware',
  RUN_TYPE = 'fine-tune-section-run-type',
  HYPERPARAMETERS = 'fun-tune-hyperparameters',
  FINE_TUNED_MODEL_DETAILS = 'fine-tune-section-fine-tuned-model-details',
}

export enum PipelineInputParameters {
  TRAIN_TOLERATIONS = 'train_tolerations',
  TRAIN_NODE_SELECTORS = 'train_node_selectors',
  TRAIN_GPU_IDENTIFIER = 'train_gpu_identifier',
  TRAIN_GPU_PER_WORKER = 'train_gpu_per_worker',
  TRAIN_CPU_PER_WORKER = 'train_cpu_per_worker',
  TRAIN_MEMORY_PER_WORKER = 'train_memory_per_worker',
  TRAIN_NUM_WORKERS = 'train_num_workers',
  EVAL_GPU_IDENTIFIER = 'eval_gpu_identifier',
  K8S_STORAGE_CLASS_NAME = 'k8s_storage_class_name',
}

export const fineTunePageSectionTitles: Record<FineTunePageSections, string> = {
  [FineTunePageSections.PROJECT_DETAILS]: 'Project details',
  [FineTunePageSections.PIPELINE_DETAILS]: 'Pipeline details',
  [FineTunePageSections.TAXONOMY_DETAILS]: 'Taxonomy details',
  [FineTunePageSections.BASE_MODEL]: 'Base model',
  [FineTunePageSections.TEACHER_MODEL]: 'Teacher model',
  [FineTunePageSections.JUDGE_MODEL]: 'Judge model',
  [FineTunePageSections.TRAINING_HARDWARE]: 'Training hardware',
  [FineTunePageSections.RUN_TYPE]: 'Run type',
  [FineTunePageSections.HYPERPARAMETERS]: 'Hyperparameters',
  [FineTunePageSections.FINE_TUNED_MODEL_DETAILS]: 'Fine-tuned model details',
};

export const ILAB_PIPELINE_NAME = 'instructlab';

export const BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY = 'baseModelInputStorageLocationUri';

export const CONTAINER_RESOURCE_DEFAULT = {
  limits: {
    cpu: '2',
    memory: '20Gi',
  },
  requests: {
    cpu: '2',
    memory: '20Gi',
  },
};
export enum RunTypeFormat {
  FULL = 'Full',
  SIMPLE = 'Simple',
}

export enum HyperparameterDisplayFields {
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
}

export const RunTypeFormatDescriptions: Record<RunTypeFormat, string> = {
  [RunTypeFormat.FULL]:
    'This run type has a larger synthetic data generation step, requires more time and resources, and is best for producing high-quality results.',
  [RunTypeFormat.SIMPLE]:
    'This run type has a smaller synthetic data generation step, requires less time and resources, and is best for quickly testing and iterating.',
};

export enum NonDisplayedHyperparameterFields {
  OUTPUT_OCI_MODEL_URI = 'output_oci_model_uri',
  OUTPUT_OCI_REGISTRY_SECRET = 'output_oci_registry_secret',
  OUTPUT_MODEL_NAME = 'output_model_name',
  OUTPUT_MODEL_VERSION = 'output-model_version',
  OUTPUT_MODEL_REGISTRY_API_URL = 'output_model_registry_api_url',
  OUTPUT_MODEL_REGISTRY_NAME = 'output_model_registry_name',
  OUTPUT_MODELCAR_BASE_IMAGE = 'output_modelcar_base_image',
  SDG_SECRET_URL = 'sdg_repo_url',
  SDG_REPO_SECRET = 'sdg_repo_secret',
  SDG_REPO_BRANCH = 'sdg_repo_branch',
  SDG_TEACHER_SECRET = 'sdg_teacher_secret',
  SDG_BASE_MODEL = 'sdg_base_model',
  TRAIN_TOLERATIONS = 'train_tolerations',
  TRAIN_NODE_SELECTORS = 'train_node_selectors',
  TRAIN_GPU_IDENTIFIER = 'train_gpu_identifier',
  TRAIN_GPU_PER_WORKER = 'train_gpu_per_worker',
  TRAIN_CPU_PER_WORKER = 'train_cpu_per_worker',
  TRAIN_MEMORY_PER_WORKER = 'train_memory_per_worker',
  EVAL_JUDGE_SECRET = 'eval_judge_secret',
  SDG_PIPELINE = 'sdg_pipeline',
  EVAL_GPU_IDENTIFIER = 'eval_gpu_identifier',
  K8S_STORAGE_CLASS_NAME = 'k8s_storage_class_name',
}
