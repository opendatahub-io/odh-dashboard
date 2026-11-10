/** Host-supplied custom-event delivery; features own event names and payloads. */
export type TrackEvent = (
  eventName: string,
  properties: Record<string, string | number | boolean | string[] | undefined>,
) => void;

/** Page delivery is distinct from custom events and remains host-controlled. */
export type TrackPageEvent = () => void;

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
