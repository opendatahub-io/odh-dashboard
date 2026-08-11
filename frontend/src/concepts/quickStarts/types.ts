export type { QuickStart } from '@patternfly/quickstarts';

export enum QuickStartStatus {
  COMPLETE = 'Complete',
  IN_PROGRESS = 'In Progress',
  NOT_STARTED = 'Not started',
}

export enum QuickStartTaskStatus {
  INIT = 'Initial',
  VISITED = 'Visited',
  REVIEW = 'Review',
  SUCCESS = 'Success',
  FAILED = 'Failed',
}
