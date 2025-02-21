export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  TEACHER_MODEL = 'fine-tune-section-teacher-model',
  JUDGE_MODEL = 'fine-tune-section-judge-model',
}

export const fineTunePageSectionTitles: Record<FineTunePageSections, string> = {
  [FineTunePageSections.PROJECT_DETAILS]: 'Project details',
  [FineTunePageSections.TEACHER_MODEL]: 'Teacher model',
  [FineTunePageSections.JUDGE_MODEL]: 'Judge model',
};

export const ILAB_PIPELINE_NAME = 'instructlab';
