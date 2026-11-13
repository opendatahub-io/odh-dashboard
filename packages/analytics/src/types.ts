/** SDK-free page context captured by a delivery adapter for a custom event. */
export type TrackingPageContext = {
  path: string;
  referrer: string;
  search: string;
  title: string;
  url: string;
};

/** A feature supplies its privacy rules; the adapter applies them before SDK delivery. */
export type PageContextPolicy = (page: Readonly<TrackingPageContext>) => TrackingPageContext;

export type TrackEventOptions = {
  pageContextPolicy?: PageContextPolicy;
};

/** Host-supplied custom-event delivery; features own event names and payloads. */
export type TrackEvent = (
  eventName: string,
  properties: Record<string, string | number | boolean | string[] | undefined>,
  options?: TrackEventOptions,
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
