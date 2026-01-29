import React from 'react';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import type {
  ProjectKind,
  SecretKind,
  SupportedModelFormats,
} from '@odh-dashboard/internal/k8sTypes';
import type { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type { z } from 'zod';
import type {
  ModelServerOption,
  useModelServerSelectField,
} from './fields/ModelServerTemplateSelectField';
import type { useModelTypeField } from './fields/ModelTypeSelectField';
import type { useExternalRouteField } from './fields/ExternalRouteField';
import type { useModelAvailabilityFields } from './fields/ModelAvailabilityFields';
import type { useEnvironmentVariablesField } from './fields/EnvironmentVariablesField';
import type { useModelFormatField } from './fields/ModelFormatField';
import type { useModelLocationData } from './fields/ModelLocationInputFields';
import type { useNumReplicasField } from './fields/NumReplicasField';
import type { useRuntimeArgsField } from './fields/RuntimeArgsField';
import type { useTokenAuthenticationField } from './fields/TokenAuthenticationField';
import type { useDeploymentStrategyField } from './fields/DeploymentStrategyField';
import {
  useCreateConnectionData,
  type CreateConnectionData,
} from './fields/CreateConnectionInputFields';
import { useProjectSection } from './fields/ProjectSection';
import type { ModelServingClusterSettings } from '../../concepts/useModelServingClusterSettings';

export enum ConnectionTypeRefs {
  S3 = 's3',
  URI = 'uri-v1',
  OCI = 'oci-v1',
}

export enum ModelLocationType {
  NEW = 'new',
  EXISTING = 'existing',
  PVC = 'pvc',
}
export enum ModelLocationSelectOption {
  EXISTING = 'Existing connection',
  PVC = 'Cluster storage',
  S3 = 'S3 object storage',
  OCI = 'OCI compliant registry',
  URI = 'URI',
}

export enum ModelTypeLabel {
  PREDICTIVE = 'Predictive model',
  GENERATIVE = 'Generative AI model (Example, LLM)',
}

export enum ModelStateLabel {
  STOPPED = 'Stopped',
  STOPPING = 'Stopping',
  STARTING = 'Starting',
  STARTED = 'Started',
  RUNNING = 'Running',
  FAILED_TO_LOAD = 'Failed to load',
}

export enum ModelStateToggleLabel {
  START = 'Start',
  STOP = 'Stop',
}

export enum WizardStepTitle {
  MODEL_DETAILS = 'Model details',
  MODEL_DEPLOYMENT = 'Model deployment',
  ADVANCED_SETTINGS = 'Advanced settings',
  REVIEW = 'Review',
}

export type ModelLocationData = {
  type: ModelLocationType.EXISTING | ModelLocationType.NEW | ModelLocationType.PVC;
  connectionTypeObject?: ConnectionTypeConfigMapObj;
  connection?: string;
  disableInputFields?: boolean;
  prefillAlertText?: string;
  fieldValues: Record<string, ConnectionTypeValueType>;
  additionalFields: {
    // For S3 and OCI additional fields
    modelPath?: string;
    modelUri?: string;
    pvcConnection?: string;
  };
};

/**
 * Initial data for the deployment wizard form.
 * Known field data properties are explicitly typed, while dynamic field data
 * (from WizardField2Extension) can be added with any string key.
 */
export type InitialWizardFormData = {
  wizardStartIndex?: number;
  project?: ProjectKind | null;
  modelTypeField?: ModelTypeFieldData;
  k8sNameDesc?: K8sNameDescriptionFieldData;
  externalRoute?: ExternalRouteFieldData;
  tokenAuthentication?: TokenAuthenticationFieldData;
  existingAuthTokens?: SecretKind[];
  numReplicas?: NumReplicasFieldData;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  hardwareProfile?: Parameters<typeof useHardwareProfileConfig>;
  modelFormat?: SupportedModelFormats;
  modelLocationData?: ModelLocationData;
  modelServer?: ModelServerOption;
  isEditing?: boolean;
  connections?: LabeledConnection[];
  initSelectedConnection?: LabeledConnection | undefined;
  modelAvailability?: ModelAvailabilityFieldsData;
  createConnectionData?: CreateConnectionData;
  deploymentStrategy?: DeploymentStrategyFieldData;
  transformData?: { metadata?: { labels?: Record<string, string> } };
  // Add more field handlers as needed
} & Record<string, unknown>;

export type WizardFormData = {
  initialData?: InitialWizardFormData;
  state: {
    project: ReturnType<typeof useProjectSection>;
    modelType: ReturnType<typeof useModelTypeField>;
    k8sNameDesc: ReturnType<typeof useK8sNameDescriptionFieldData>;
    hardwareProfileConfig: ReturnType<typeof useHardwareProfileConfig>;
    modelFormatState: ReturnType<typeof useModelFormatField>;
    modelLocationData: ReturnType<typeof useModelLocationData>;
    externalRoute: ReturnType<typeof useExternalRouteField>;
    tokenAuthentication: ReturnType<typeof useTokenAuthenticationField>;
    numReplicas: ReturnType<typeof useNumReplicasField>;
    runtimeArgs: ReturnType<typeof useRuntimeArgsField>;
    environmentVariables: ReturnType<typeof useEnvironmentVariablesField>;
    modelAvailability: ReturnType<typeof useModelAvailabilityFields>;
    modelServer: ReturnType<typeof useModelServerSelectField>;
    createConnectionData: ReturnType<typeof useCreateConnectionData>;
    deploymentStrategy: ReturnType<typeof useDeploymentStrategyField>;
  } & Record<string, unknown>;
};

export type WizardReviewItem = {
  key: string;
  label: string;
  value: (wizardState: WizardFormData['state']) => React.ReactNode;
  optional?: boolean;
  isVisible?: (wizardState: WizardFormData['state']) => boolean;
};

export type WizardReviewSection = {
  title?: string;
  items: WizardReviewItem[];
};
// wizard form data

// Export field data types
export type ModelTypeFieldData = WizardFormData['state']['modelType']['data'];
export type K8sNameDescriptionFieldData = WizardFormData['state']['k8sNameDesc']['data'];
export type ExternalRouteFieldData = WizardFormData['state']['externalRoute']['data'];
export type TokenAuthenticationFieldData = WizardFormData['state']['tokenAuthentication']['data'];
export type NumReplicasFieldData = WizardFormData['state']['numReplicas']['data'];
export type RuntimeArgsFieldData = WizardFormData['state']['runtimeArgs']['data'];
export type EnvironmentVariablesFieldData = WizardFormData['state']['environmentVariables']['data'];
export type ModelServerSelectFieldData = WizardFormData['state']['modelServer']['data'];
export type CreateConnectionFieldData = WizardFormData['state']['createConnectionData']['data'];
export type HardwareProfileConfigFieldData =
  WizardFormData['state']['hardwareProfileConfig']['formData'];
export type ModelFormatFieldData = WizardFormData['state']['modelFormatState']['modelFormat'];
export type ModelAvailabilityFieldsData = WizardFormData['state']['modelAvailability']['data'];
export type DeploymentStrategyFieldData = WizardFormData['state']['deploymentStrategy']['data'];

// extensible fields

export type DeploymentWizardFieldId =
  | 'modelServerTemplate'
  | 'modelAvailability'
  | 'externalRoute'
  | 'tokenAuth'
  | 'deploymentStrategy';

export type DeploymentWizardFieldBase<ID extends DeploymentWizardFieldId | string> = {
  id: ID;
  type: 'modifier' | 'replacement' | 'addition';
} & {
  isActive: (wizardFormData: RecursivePartial<WizardFormData['state']>) => boolean;
};

export type WizardField<
  FieldData = unknown,
  ExternalData = unknown,
> = DeploymentWizardFieldBase<string> & {
  type: 'addition';
  parentId?: string;
  step?: 'modelSource' | 'modelDeployment' | 'advancedOptions' | 'summary'; // used for validation of the entire step. Ideally this should be dynamic from the parent field.
  reducerFunctions: {
    // TODO: make dispatch function that clears if this field's dependencies are changing
    setFieldData: (fieldData: FieldData) => FieldData;
    getInitialFieldData: (fieldData?: FieldData, externalData?: ExternalData) => FieldData;
    validationSchema?: z.ZodSchema<FieldData>;
  };
  externalDataHook?: (initialData?: InitialWizardFormData) => {
    data: ExternalData;
    loaded: boolean;
    loadError?: Error;
  };
  component: React.FC<{
    id: string;
    value: FieldData;
    onChange: (value: FieldData) => void;
    externalData?: { data: ExternalData; loaded: boolean; loadError?: Error };
  }>;
  getReviewSections?: (
    value: FieldData,
    wizardState: WizardFormData['state'],
    externalData?: ExternalData,
  ) => WizardReviewSection[];
};

// actual fields

export type ModelServerTemplateField = DeploymentWizardFieldBase<'modelServerTemplate'> & {
  extraOptions?: ModelServerOption[];
  suggestion?: (clusterSettings?: ModelServingClusterSettings) => ModelServerOption | undefined;
};
export type ModelAvailabilityField = DeploymentWizardFieldBase<'modelAvailability'> & {
  id: 'modelAvailability';
  showSaveAsMaaS?: boolean;
};
export type ExternalRouteField = DeploymentWizardFieldBase<'externalRoute'> & {
  isVisible: boolean;
};
export type TokenAuthField = DeploymentWizardFieldBase<'tokenAuth'> & {
  initialValue: boolean;
};

// union type

export type DeploymentWizardField =
  | ModelServerTemplateField
  | ModelAvailabilityField
  | ExternalRouteField
  | TokenAuthField
  | DeploymentStrategyField;

export const isModelServerTemplateField = (
  field: DeploymentWizardField,
): field is ModelServerTemplateField => {
  return field.id === 'modelServerTemplate';
};

export const isModelAvailabilityField = (
  field: DeploymentWizardField,
): field is ModelAvailabilityField => {
  return field.id === 'modelAvailability';
};
export const isExternalRouteField = (field: DeploymentWizardField): field is ExternalRouteField => {
  return field.id === 'externalRoute';
};
export const isTokenAuthField = (field: DeploymentWizardField): field is TokenAuthField => {
  return field.id === 'tokenAuth';
};
export type DeploymentStrategyField = DeploymentWizardFieldBase<'deploymentStrategy'> & {
  id: 'deploymentStrategy';
  type: 'modifier';
  isVisible: boolean;
};
export const isDeploymentStrategyField = (
  field: DeploymentWizardField,
): field is DeploymentStrategyField => {
  return field.id === 'deploymentStrategy';
};
