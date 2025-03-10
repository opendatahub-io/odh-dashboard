export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  TAXONOMY_DETAILS = 'fine-tune-section-taxonomy-details',
  BASE_MODEL = 'fine-tune-section-base-model',
  TEACHER_MODEL = 'fine-tune-section-teacher-model',
  JUDGE_MODEL = 'fine-tune-section-judge-model',
  TRAINING_HARDWARE = 'fine-tune-section-training-hardware',
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
  [FineTunePageSections.TAXONOMY_DETAILS]: 'Taxonomy details',
  [FineTunePageSections.BASE_MODEL]: 'Base model',
  [FineTunePageSections.TEACHER_MODEL]: 'Teacher model',
  [FineTunePageSections.JUDGE_MODEL]: 'Judge model',
  [FineTunePageSections.TRAINING_HARDWARE]: 'Training hardware',
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
