export type ODHSegmentKey = {
  segmentKey: string;
};

export type IdentifyEventProperties = {
  isAdmin: boolean;
  userID?: string;
  canCreateProjects: boolean;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type BaseTrackingEventProperties = {
  // empty for the moment
};

export type LinkTrackingEventProperties = {
  from?: string;
  href?: string;
  to?: string;
  type?: string;
  section?: string;
  name?: string;
  projectName?: string;
} & BaseTrackingEventProperties;

export type MiscTrackingEventProperties = {
  [key: string]: string | number | boolean | undefined;
} & BaseTrackingEventProperties;
