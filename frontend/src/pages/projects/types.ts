import {
  ContainerResources,
  ImageStreamAndVersion,
  NotebookSize,
  PodToleration,
  TolerationSettings,
  Volume,
  VolumeMount,
} from '~/types';
import { ValueOf } from '~/typeHelpers';
import { AWSSecretKind } from '~/k8sTypes';
import { AcceleratorState } from '~/utilities/useAcceleratorState';
import { AWS_KEYS } from './dataConnections/const';

export type UpdateObjectAtPropAndValue<T> = (propKey: keyof T, propValue: ValueOf<T>) => void;

export type NameDescType = {
  name: string;
  k8sName?: string;
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
  hasExistingNotebookConnections: boolean;
};

export type ExistingStorageObjectForNotebook = ForNotebookSelection;

export type ExistingStorageObject = {
  storage: string;
};

export enum StorageType {
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
  accelerator: AcceleratorState;
  image: ImageStreamAndVersion;
  volumes?: Volume[];
  volumeMounts?: VolumeMount[];
  tolerationSettings?: TolerationSettings;
  existingTolerations?: PodToleration[];
  existingResources?: ContainerResources;
  envFrom?: EnvironmentFromVariable[];
  description?: string;
  /** An override for the assembleNotebook so it doesn't regen an id */
  notebookId?: string;
};

export type SecretRef = {
  secretRef: {
    name: string;
  };
};
export type ConfigMapRef = {
  configMapRef: {
    name: string;
  };
};

export type EnvironmentFromVariable = Partial<SecretRef> & Partial<ConfigMapRef>;

export type DataConnectionData = {
  type: 'creating' | 'existing';
  enabled: boolean;
  creating?: EnvVariable;
  existing?: SecretRef;
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

export type AWSDataEntry = { key: AWS_KEYS; value: string }[];

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
  existingName?: string;
  values?: EnvVariableData;
};

export enum EnvironmentVariableType {
  CONFIG_MAP = 'Config Map',
  SECRET = 'Secret',
}
export enum SecretCategory {
  GENERIC = 'secret key-value',
  AWS = 'aws',
  UPLOAD = 'secret upload',
}
export enum ConfigMapCategory {
  GENERIC = 'configmap key-value',
  UPLOAD = 'configmap upload',
}

export enum NamespaceApplicationCase {
  /**
   * Supports the flow for when a project is created in the DSG create project flow.
   */
  DSG_CREATION,
  /**
   * Upgrade an existing DSG project to work with model mesh.
   */
  MODEL_MESH_PROMOTION,
  /**
   * Upgrade an existing DSG project to work with model kserve.
   */
  KSERVE_PROMOTION,
}
