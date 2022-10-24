import {
  ImageStreamAndVersion,
  NotebookSize,
  NotebookTolerationSettings,
  Volume,
  VolumeMount,
} from '../../types';
import { ValueOf } from '../../typeHelpers';
import { AWSSecretKind } from '../../k8sTypes';

export type UpdateObjectAtPropAndValue<T> = (propKey: keyof T, propValue: ValueOf<T>) => void;

export type NameDescType = {
  name: string;
  description: string;
};

export type CreatingStorageObject = {
  nameDesc: NameDescType;
  size: number;
};

export type MountPath = {
  /** Suffix to the root path */
  value: string;
  /** Any error with the value */
  error: string;
};

export type ForNotebookSelection = {
  name: string;
  mountPath: MountPath;
};

export type CreatingStorageObjectForNotebook = CreatingStorageObject & {
  forNotebook: ForNotebookSelection;
  existingNotebooks: string[];
  hasExistingNotebookConnections: boolean;
};

export type ExistingStorageObjectForNotebook = ForNotebookSelection;

export type ExistingStorageObject = {
  storage: string;
};

export enum StorageType {
  EPHEMERAL = 'ephemeral',
  NEW_PVC = 'new-persistent',
  EXISTING_PVC = 'existing-persistent',
}

export type StorageData = {
  storageType: StorageType;
  creating: CreatingStorageObject;
  existing: ExistingStorageObject;
};

export type StartNotebookData = {
  projectName: string;
  notebookName: string;
  notebookSize: NotebookSize;
  gpus: number;
  image: ImageStreamAndVersion;
  volumes: Volume[];
  volumeMounts: VolumeMount[];
  tolerationSettings?: NotebookTolerationSettings;
  envFrom?: EnvFromSourceType[];
  description?: string;
};
export type EnvFromSourceType = {
  configMapRef?: {
    name: string;
  };
  secretRef?: {
    name: string;
  };
};

export enum DataConnectionType {
  AWS,
}

export type DataConnectionAWS = {
  type: DataConnectionType.AWS;
  data: AWSSecretKind;
};

export type DataConnection = {
  type: DataConnectionType;
  data: Record<string, unknown>; // likely will be a unified CR at some point
} & DataConnectionAWS;

export type EnvVariableDataEntry = {
  key: string;
  value: string;
};

export type EnvVariableData = {
  category: SecretCategory | ConfigMapCategory | null;
  data: EnvVariableDataEntry[];
};

export type EnvVariable = {
  type: EnvironmentVariableType | null;
  values?: EnvVariableData;
};

export enum EnvironmentVariableType {
  CONFIG_MAP = 'Config Map',
  SECRET = 'Secret',
}
export enum SecretCategory {
  GENERIC = 'Key / Value',
  AWS = 'AWS',
}
export enum ConfigMapCategory {
  GENERIC = 'Key / Value',
  UPLOAD = 'Upload',
}
