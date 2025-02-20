export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  BASE_MODEL = 'fine-tune-section-base-model',
}

export const fineTunePageSectionTitles: Record<FineTunePageSections, string> = {
  [FineTunePageSections.PROJECT_DETAILS]: 'Project details',
  [FineTunePageSections.BASE_MODEL]: 'Base model',
};

export const ILAB_PIPELINE_NAME = 'instructlab';
