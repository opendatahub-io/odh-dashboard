import {
  ConfigMapCategory,
  EnvironmentVariableType,
  SecretCategory,
  StorageType,
} from '~/pages/projects/types';

export interface IdentifyEventProperties {
  anonymousID?: string;
}

export enum TrackingOutcome {
  submit = 'submit',
  cancel = 'cancel',
}

export interface BaseTrackingEventProperties {
  name?: string;
  anonymousID?: string;
  outcome?: TrackingOutcome;
  success?: boolean;
  error?: string;
}

export interface WorkbenchTrackingEventProperties extends BaseTrackingEventProperties {
  type?: string;
  term?: string;
  imageName?: string;
  accelerator?: string;
  acceleratorCount?: number;
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
}

export interface ProjectTrackingEventProperties extends BaseTrackingEventProperties {
  projectName: string;
}

export interface LinkTrackingEventProperties extends BaseTrackingEventProperties {
  from: string;
  href: string;
}

export interface SearchTrackingEventProperties extends BaseTrackingEventProperties {
  term: string;
}

export interface NotebookTrackingEventProperties extends BaseTrackingEventProperties {
  accelerator?: string;
  acceleratorCount?: number;
  lastSelectedSize?: string;
  lastSelectedImage?: string;
}

export interface DocCardTrackingEventProperties extends BaseTrackingEventProperties {
  type: string;
}

export interface HomeCardTrackingEventProperties extends BaseTrackingEventProperties {
  to: string;
  type: string;
  section: string;
}
