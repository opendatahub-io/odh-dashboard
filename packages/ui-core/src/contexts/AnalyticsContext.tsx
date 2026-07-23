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

export type AnalyticsAPI = {
  fireFormTrackingEvent: (eventName: string, properties: FormTrackingEventProperties) => void;
};

const noopAnalytics: AnalyticsAPI = {
  fireFormTrackingEvent: () => undefined,
};

export const AnalyticsContext = React.createContext<AnalyticsAPI>(noopAnalytics);

export const useAnalytics = (): AnalyticsAPI => React.useContext(AnalyticsContext);
