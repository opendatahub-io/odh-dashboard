import * as React from 'react';

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
  [key: string]: string | number | boolean | undefined;
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

export type AnalyticsAPI = {
  fireFormTrackingEvent: (eventName: string, properties: FormTrackingEventProperties) => void;
  fireMiscTrackingEvent: (eventName: string, properties: MiscTrackingEventProperties) => void;
  fireLinkTrackingEvent: (eventName: string, properties: LinkTrackingEventProperties) => void;
  fireSimpleTrackingEvent: (eventName: string) => void;
  firePageEvent: () => void;
  fireIdentifyEvent: (properties: IdentifyEventProperties) => void;
};

export const noopAnalytics: AnalyticsAPI = {
  fireFormTrackingEvent: () => undefined,
  fireMiscTrackingEvent: () => undefined,
  fireLinkTrackingEvent: () => undefined,
  fireSimpleTrackingEvent: () => undefined,
  firePageEvent: () => undefined,
  fireIdentifyEvent: () => undefined,
};

export const AnalyticsContext = React.createContext<AnalyticsAPI>(noopAnalytics);

export const useAnalytics = (): AnalyticsAPI => React.useContext(AnalyticsContext);
