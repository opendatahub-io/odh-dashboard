import {
  ConfigMapCategory,
  EnvironmentVariableType,
  SecretCategory,
  StorageType,
} from '~/pages/projects/types';

export enum TrackingOutcome {
  submit = 'submit',
  cancel = 'cancel',
}

export type TrackingEventProperties = {
  anonymousID?: string;
};

export type IdentifyEventProperties = {} & TrackingEventProperties;

export type NamedTrackingProperties = {
  name: string;
} & TrackingEventProperties;

export type FormTrackingEventProperties = {
  name?: string;
  outcome?: TrackingOutcome;
  success?: boolean;
  error?: string;
} & TrackingEventProperties;

export type WorkbenchTrackingEventProperties = {
  type?: string;
  term?: string;
  imageName?: string;
  accelerator?: string;
  acceleratorCount?: number | undefined;
  lastSelectedSize?: string;
  lastSelectedImage?: string;
  projectName?: string;
  notebookName?: string;
  lastActivity?: string;
  storageType?: StorageType;
  storageDataSize?: string;
  dataConnectionType?: EnvironmentVariableType | null;
  dataConnectionCategory?: ConfigMapCategory | SecretCategory | null;
  dataConnectionEnabled?: boolean;
} & FormTrackingEventProperties;

export type ProjectTrackingEventProperties = {
  projectName: string;
} & FormTrackingEventProperties;

export type LinkTrackingEventProperties = {
  from: string;
  href: string;
} & TrackingEventProperties;

export type SearchTrackingEventProperties = {
  term: string;
} & TrackingEventProperties;

export type NotebookTrackingEventProperties = {
  accelerator?: string;
  acceleratorCount?: number;
  lastSelectedSize?: string;
  lastSelectedImage?: string;
} & FormTrackingEventProperties;

export type DocCardTrackingEventProperties = {
  type: string;
} & TrackingEventProperties;

export type HomeCardTrackingEventProperties = {
  to: string;
  type: string;
  section: string;
} & TrackingEventProperties;
