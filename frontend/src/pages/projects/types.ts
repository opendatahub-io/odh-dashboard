import {
  EnvVarReducedType,
  ImageStreamAndVersion,
  NotebookSize,
  NotebookTolerationSettings,
  Volume,
  VolumeMount,
} from '../../types';
import { ValueOf } from '../../typeHelpers';

export type UpdateObjectAtPropAndValue<T> = (propKey: keyof T, propValue: ValueOf<T>) => void;

export type NameDescType = {
  name: string;
  description: string;
};

export type CreatingStorageObject = {
  nameDesc: NameDescType;
  size: number;
  workspaceSelection?: string;
  enabled: boolean;
};

export type ExistingStorageObject = {
  project?: string;
  storage?: string;
  enabled: boolean;
};

export type StorageData = {
  storageType: 'ephemeral' | 'persistent';
  creating: CreatingStorageObject;
  existing: ExistingStorageObject;
};

export type StartNotebookData = {
  projectName: string;
  notebookName: string;
  username: string;
  notebookSize: NotebookSize;
  gpus: number;
  image: ImageStreamAndVersion;
  volumes: Volume[];
  volumeMounts: VolumeMount[];
  tolerationSettings?: NotebookTolerationSettings;
  envVars?: EnvVarReducedType;
  description?: string;
};
