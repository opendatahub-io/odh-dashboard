import React from 'react';
import type { z } from 'zod';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import type { ProjectKind, SecretKind, SupportedModelFormats } from '@odh-dashboard/k8s-core';
import type { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import type {
  ModelServerOption,
  ModelServerSelectField,
  ModelServerSelectFieldData,
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
import { NIMModelLocationKey } from './fields/modelLocationFields/NIMModelLocation';
import { getStateKey } from './dynamicFormUtils';
import type { DeploymentMethodFieldData } from './fields/DeploymentMethodSelectField';
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
  NIM = NIMModelLocationKey,
}
export const isModelLocationType = (value?: string): value is ModelLocationType => {
  if (!value) return false;
  const values: string[] = Object.values(ModelLocationType);
  return values.includes(value);
};

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
  READY = 'Ready',
  RUNNING = 'Running',
  FAILED_TO_LOAD = 'Failed to load',
}

export enum ModelStateToggleLabel {
  START = 'Start',
  STOP = 'Stop',
}

export enum WizardStepTitle {
  PRECONFIGURE = 'Preconfigure deployment',
  MODEL_DETAILS = 'Model details',
  MODEL_DEPLOYMENT = 'Model deployment',
  ADVANCED_SETTINGS = 'Advanced settings',
  REVIEW = 'Review',
}

export enum YAMLViewerToggleOption {
  YAML = 'YAML',
  FORM = 'Form',
}

export type ModelLocationData = {
  type: ModelLocationType;
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
 * (from WizardFieldExtension) can be added with any string key.
 */
export type InitialWizardFormData = {
  // wizard
  wizardStartIndex?: number;
  isEditing?: boolean;
  viewMode?: 'form' | 'yaml-preview' | 'yaml-edit';
  // fields
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
  modelServer?: { data: ModelServerSelectFieldData };
  connections?: LabeledConnection[];
  initSelectedConnection?: LabeledConnection | undefined;
  modelAvailability?: ModelAvailabilityFieldsData;
  createConnectionData?: CreateConnectionData;
  deploymentStrategy?: DeploymentStrategyFieldData;
  // deploying — serializable metadata merged onto the deployment during assembly
  navSourceMetadata?: K8sResourceCommon['metadata'];
} & Record<string, unknown>;

export type WizardFormData = {
  initialData?: InitialWizardFormData;
  state: {
    project: ReturnType<typeof useProjectSection>;
    modelType: ReturnType<typeof useModelTypeField>;
    k8sNameDesc: ReturnType<typeof useK8sNameDescriptionFieldData>;
    deploymentMethod?: DeploymentMethodFieldData;
    hardwareProfileConfig: ReturnType<typeof useHardwareProfileConfig>;
    modelFormatState: ReturnType<typeof useModelFormatField>;
    modelLocationData: ReturnType<typeof useModelLocationData>;
    externalRoute: ReturnType<typeof useExternalRouteField>;
    tokenAuthentication: ReturnType<typeof useTokenAuthenticationField>;
    numReplicas: ReturnType<typeof useNumReplicasField>;
    runtimeArgs: ReturnType<typeof useRuntimeArgsField>;
    environmentVariables: ReturnType<typeof useEnvironmentVariablesField>;
    modelAvailability: ReturnType<typeof useModelAvailabilityFields>;
    modelServer?: ModelServerSelectField;
    createConnectionData: ReturnType<typeof useCreateConnectionData>;
    deploymentStrategy: ReturnType<typeof useDeploymentStrategyField>;
    canCreateRoleBindings: boolean;
    devFeatureFlags?: {
      vLLMDeploymentOnMaaS: boolean;
    };
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
export type CreateConnectionFieldData = WizardFormData['state']['createConnectionData']['data'];
export type HardwareProfileConfigFieldData =
  WizardFormData['state']['hardwareProfileConfig']['formData'];
export type ModelFormatFieldData = WizardFormData['state']['modelFormatState']['modelFormat'];
export type ModelAvailabilityFieldsData = WizardFormData['state']['modelAvailability']['data'];
export type DeploymentStrategyFieldData = WizardFormData['state']['deploymentStrategy']['data'];

// extensible fields

export type DeploymentWizardFieldId =
  | 'modelType'
  | 'modelServerTemplate'
  | 'modelAvailability'
  | 'externalRoute'
  | 'tokenAuth'
  | 'deploymentStrategy'
  | 'deploymentMethod';

export type DeploymentWizardFieldBase<ID extends DeploymentWizardFieldId | string> = {
  id: ID;
  type: 'modifier' | 'replacement' | 'addition';
} & {
  isActive: (wizardFormData: RecursivePartial<WizardFormData['state']>) => boolean;
};

export type GenericFieldProps = {
  isEditing?: boolean;
  isDisabled?: boolean;
};

export type WizardStateOverrides = {
  tokenAuthentication?: { isDisabled?: boolean };
  'llmd-serving/gateway'?: {
    isDisabled?: boolean;
    selection?: { name: string; namespace?: string };
    hiddenOptions?: { name: string; namespace?: string }[];
  };
};

export type WizardField<
  FieldData = unknown,
  ExternalData = unknown,
  Dependencies extends Record<string, unknown> = Record<string, unknown>,
> = DeploymentWizardFieldBase<string> & {
  type: 'addition' | 'replacement';
  stateKey?: string;
  parentId?: string;
  step?: 'modelSource' | 'modelDeployment' | 'advancedOptions' | 'summary'; // used for validation of the entire step. Ideally this should be dynamic from the parent field.
  reducerFunctions: {
    setFieldData: (fieldData: FieldData) => FieldData;
    getFieldData?: (storedValue: FieldData, wizardState: WizardFormData['state']) => FieldData;
    getInitialFieldData: (
      existingFieldData?: FieldData,
      externalData?: ExternalData,
      dependencies?: Dependencies,
    ) => FieldData;
    resolveDependencies?: (formData: WizardFormData['state']) => Dependencies;
    validationSchema?: z.ZodSchema<FieldData>;
    getFieldOverrides?: (
      effectiveValue: FieldData,
      wizardState: RecursivePartial<WizardFormData['state']>,
    ) => WizardStateOverrides;
  };
  shouldResetOnDependencyChange?: (
    prevDependencies: Dependencies,
    newDependencies: Dependencies,
  ) => boolean;
  externalDataHook?: (dependencies?: Dependencies) => {
    data: ExternalData;
    loaded: boolean;
    loadError?: Error;
  };
  component: React.FC<
    {
      id: string;
      value?: FieldData;
      initialValue?: FieldData;
      onChange: (value: FieldData) => void;
      externalData?: { data: ExternalData; loaded: boolean; loadError?: Error };
      dependencies?: Dependencies;
    } & GenericFieldProps
  >;
  getReviewSections?: (
    value: FieldData,
    wizardState: WizardFormData['state'],
    externalData?: ExternalData,
  ) => WizardReviewSection[];
};

/**
 * Resolves the effective field value from wizard state.
 *
 * Retrieves the stored value from state using the field's stateKey (or id as fallback),
 * then applies the field's getFieldData transformation if defined.
 *
 * @param field The wizard field to resolve
 * @param state The current wizard form state
 * @returns The resolved field value, or undefined if not present or error occurred
 */
export const resolveFieldValue = (
  field: WizardField,
  state: WizardFormData['state'],
): unknown | undefined => {
  const stateKey = getStateKey(field);
  if (!(stateKey in state)) {
    return undefined;
  }

  const storedValue: unknown = state[stateKey];
  if (storedValue == null) {
    return undefined;
  }

  try {
    return field.reducerFunctions.getFieldData
      ? field.reducerFunctions.getFieldData(storedValue, state)
      : storedValue;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error resolving field value for ${field.id}:`, error);
    return undefined;
  }
};

// actual fields

export type ModelTypeFieldOverride = DeploymentWizardFieldBase<'modelType'> & {
  extraOption: SimpleSelectOption;
  forced?: boolean;
};
export type ModelServerTemplateFieldOverride = DeploymentWizardFieldBase<'modelServerTemplate'> & {
  extraOptions?: ModelServerOption[];
  suggestion?: (
    clusterSettings: ModelServingClusterSettings | null | undefined,
  ) => ModelServerOption | undefined;
};
export type ModelAvailabilityFieldOverride = DeploymentWizardFieldBase<'modelAvailability'> & {
  id: 'modelAvailability';
  showSaveAsMaaS?: boolean;
};
export type ExternalRouteFieldOverride = DeploymentWizardFieldBase<'externalRoute'> & {
  isVisible: boolean;
};
export type TokenAuthFieldOverride = DeploymentWizardFieldBase<'tokenAuth'> & {
  initialValue: boolean;
};

// union type

export type DeploymentWizardFieldOverride =
  | ModelTypeFieldOverride
  | ModelServerTemplateFieldOverride
  | ModelAvailabilityFieldOverride
  | ExternalRouteFieldOverride
  | TokenAuthFieldOverride
  | DeploymentStrategyFieldOverride
  | DeploymentMethodFieldOverride;

export const isModelTypeFieldOverride = (
  field: DeploymentWizardFieldOverride,
): field is ModelTypeFieldOverride => {
  return field.id === 'modelType';
};
export const isModelServerTemplateFieldOverride = (
  field: DeploymentWizardFieldOverride,
): field is ModelServerTemplateFieldOverride => {
  return field.id === 'modelServerTemplate';
};
export const isModelAvailabilityFieldOverride = (
  field: DeploymentWizardFieldOverride,
): field is ModelAvailabilityFieldOverride => {
  return field.id === 'modelAvailability';
};
export const isExternalRouteFieldOverride = (
  field: DeploymentWizardFieldOverride,
): field is ExternalRouteFieldOverride => {
  return field.id === 'externalRoute';
};
export const isTokenAuthFieldOverride = (
  field: DeploymentWizardFieldOverride,
): field is TokenAuthFieldOverride => {
  return field.id === 'tokenAuth';
};
export type DeploymentStrategyFieldOverride = DeploymentWizardFieldBase<'deploymentStrategy'> & {
  id: 'deploymentStrategy';
  type: 'modifier';
  isVisible: boolean;
};
export const isDeploymentStrategyFieldOverride = (
  field: DeploymentWizardFieldOverride,
): field is DeploymentStrategyFieldOverride => {
  return field.id === 'deploymentStrategy';
};

export type DeploymentMethodOption = SimpleSelectOption & {
  description: string;
};
export type DeploymentMethodFieldOverride = DeploymentWizardFieldBase<'deploymentMethod'> & {
  options: DeploymentMethodOption[];
  suggestion?: (
    clusterSettings: ModelServingClusterSettings | null | undefined,
  ) => DeploymentMethodOption | undefined;
};
export const isDeploymentMethodFieldOverride = (
  field: DeploymentWizardFieldOverride,
): field is DeploymentMethodFieldOverride => {
  return field.id === 'deploymentMethod';
};
