import { ImageStreamAndVersion, KeyValuePair, Volume, VolumeMount } from '#~/types';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import { NotebookPodSpecOptions } from '#~/concepts/hardwareProfiles/useNotebookPodSpecOptionsState';
import { AwsKeys } from './dataConnections/const';

export type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(
  propKey: K,
  propValue: T[K],
) => void;

export type NameDescType = {
  name: string;
  k8sName?: string;
  description: string;
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

export type ClusterStorageNotebookSelection = ForNotebookSelection & {
  existingPvc: boolean;
  notebookDisplayName?: string;
  isUpdatedValue: boolean;
  newRowId?: number;
};

export type CreatingStorageObjectForNotebook = NameDescType & {
  size: string;
  forNotebook: ForNotebookSelection;
  hasExistingNotebookConnections: boolean;
  storageClassName?: string;
  mountPath?: string;
};

export type ExistingStorageObjectForNotebook = ForNotebookSelection;

export type ExistingStorageObject = {
  storage: string;
  pvc?: PersistentVolumeClaimKind;
};

export enum StorageType {
  NEW_PVC = 'new-persistent',
  EXISTING_PVC = 'existing-persistent',
}

export type StorageData = {
  name: string;
  k8sName?: string;
  size?: string;
  storageType?: StorageType;
  description?: string;
  storageClassName?: string;
  mountPath?: string;
  existingName?: string;
  existingPvc?: PersistentVolumeClaimKind;
  id?: number;
};

export type StartNotebookData = {
  projectName: string;
  notebookData: K8sNameDescriptionFieldData;
  image: ImageStreamAndVersion;
  podSpecOptions: NotebookPodSpecOptions;
  volumes?: Volume[];
  volumeMounts?: VolumeMount[];
  envFrom?: EnvironmentFromVariable[];
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

export type AWSDataEntry = { key: AwsKeys; value: string }[];

export type EnvVariableDataEntry = KeyValuePair;

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
  /**
   * Nvidia NIMs run on KServe but have different requirements than regular models.
   */
  KSERVE_NIM_PROMOTION,
  /**
   * Downgrade a project from Modelmesh, Kserve or NIM so the platform can be selected again.
   */
  RESET_MODEL_SERVING_PLATFORM,
}
