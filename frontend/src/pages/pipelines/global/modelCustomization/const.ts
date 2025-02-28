export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  TAXONOMY_DETAILS = 'fine-tune-section-taxonomy-details',
  BASE_MODEL = 'fine-tune-section-base-model',
  TEACHER_MODEL = 'fine-tune-section-teacher-model',
  JUDGE_MODEL = 'fine-tune-section-judge-model',
  TRAINING_HARDWARE = 'fine-tune-section-training-hardware',
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
