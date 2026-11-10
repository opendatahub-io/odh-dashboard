export const enum TrackingOutcome {
  submit = 'submit',
  cancel = 'cancel',
}

export type FormTrackingEventProperties = {
  outcome: TrackingOutcome;
  success?: boolean;
  error?: string;
  [key: string]: string | number | boolean | undefined;
};

export type MiscTrackingEventProperties = {
  [key: string]: string | number | boolean | string[] | undefined;
};

export type LinkTrackingEventProperties = {
  from?: string;
  href?: string;
  to?: string;
  type?: string;
  section?: string;
  name?: string;
  projectName?: string;
};

export type IdentifyEventProperties = {
  isAdmin: boolean;
  userID?: string;
  canCreateProjects: boolean;
};
