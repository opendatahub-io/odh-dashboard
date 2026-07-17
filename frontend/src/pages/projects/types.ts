import type {
  EnvironmentFromVariable,
  K8sNameDescriptionFieldData,
  Volume,
  VolumeMount,
  PersistentVolumeClaimKind,
} from '@odh-dashboard/k8s-core';
import { ImageStreamAndVersion, KeyValuePair } from '#~/types';
import { NotebookKind } from '#~/k8sTypes';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { Connection } from '#~/concepts/connectionTypes/types.ts';
import { UseAssignHardwareProfileResult } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';

import { NotebookFeatureStore } from './screens/spawner/featureStore/utils';

export type FeastData = {
  featureStores: NotebookFeatureStore[];
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
};

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
  accessMode?: AccessMode;
  id?: number;
  modelName?: string;
  modelPath?: string;
};

export type StartNotebookData = {
  projectName: string;
  notebookData: K8sNameDescriptionFieldData;
  image: ImageStreamAndVersion;
  volumes?: Volume[];
  volumeMounts?: VolumeMount[];
  envFrom?: EnvironmentFromVariable[];
  dashboardNamespace?: string;
  connections?: Connection[];
  hardwareProfileOptions: UseAssignHardwareProfileResult<NotebookKind>;
  feastData?: FeastData;
  mlflowEnabled?: boolean;
};

// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared types for backward compatibility
export type {
  SecretRef,
  ConfigMapRef,
  EnvironmentFromVariable,
  AWSDataEntry,
} from '@odh-dashboard/k8s-core';

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

// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared type
export { NamespaceApplicationCase } from '@odh-dashboard/k8s-core';
