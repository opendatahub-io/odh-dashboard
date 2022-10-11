import {
  EnvVarReducedType,
  ImageStreamAndVersion,
  NotebookSize,
  NotebookTolerationSettings,
  Volume,
  VolumeMount,
} from '../../types';

export type ValueOf<T> = T[keyof T];
export type UpdateObjectAtPropAndValue<T> = (propKey: keyof T, propValue: ValueOf<T>) => void;

export type ToggleValueInSet<T> = (value: T, isAdd: boolean) => void;

export type NameDescType = {
  name: string;
  description: string;
};

export type CreatingStorageObject = {
  name: string;
  description: string;
  size: number;
  workspaceSelections: string[];
};

export type ExistingStorageObject = {
  project?: string;
  storage?: string;
};

export type StorageOptions = {
  storageType: 'ephemeral' | 'persistent';
  storageName: string;
};

export type StorageData = {
  storageType: 'ephemeral' | 'persistent';
  storageBindingType: Set<'new' | 'existing'>;
  creatingObject: CreatingStorageObject;
  existingObject: ExistingStorageObject;
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
