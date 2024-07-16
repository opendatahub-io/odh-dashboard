export type ODHSegmentKey = {
  segmentKey: string;
};

export enum TrackingOutcome {
  submit = 'submit',
  cancel = 'cancel',
}

export type TrackingEventProperties = {
  name?: string;
  anonymousID?: string;
  type?: string;
  term?: string;
  accelerator?: string;
  acceleratorCount?: number;
  lastSelectedSize?: string;
  lastSelectedImage?: string;
  projectName?: string;
  notebookName?: string;
  lastActivity?: string;
  outcome?: TrackingOutcome;
  success?: boolean;
  error?: string;
};
