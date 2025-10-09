import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import type { useModelServerSelectField } from './fields/ModelServerTemplateSelectField';
import type { useModelTypeField } from './fields/ModelTypeSelectField';
import type { useExternalRouteField } from './fields/ExternalRouteField';
import type { ModelDeploymentWizardData } from './useDeploymentWizard';
import type { useModelAvailabilityFields } from './fields/ModelAvailabilityFields';
import type { useEnvironmentVariablesField } from './fields/EnvironmentVariablesField';
import type { K8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import type { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type {
  ModelServerOption,
  useModelServerSelectField,
} from './fields/ModelServerTemplateSelectField';
import type { ModelTypeFieldData, useModelTypeField } from './fields/ModelTypeSelectField';
import type { ExternalRouteFieldData, useExternalRouteField } from './fields/ExternalRouteField';
import type {
  ModelAvailabilityFieldsData,
  useModelAvailabilityFields,
} from './fields/ModelAvailabilityFields';
import type {
  EnvironmentVariablesFieldData,
  useEnvironmentVariablesField,
} from './fields/EnvironmentVariablesField';
import type { useModelFormatField } from './fields/ModelFormatField';
import type { useModelLocationData } from './fields/ModelLocationInputFields';
import type { NumReplicasFieldData, useNumReplicasField } from './fields/NumReplicasField';
import type { RuntimeArgsFieldData, useRuntimeArgsField } from './fields/RuntimeArgsField';
import type {
  TokenAuthenticationFieldData,
  useTokenAuthenticationField,
} from './fields/TokenAuthenticationField';
import {
  useCreateConnectionData,
  type CreateConnectionData,
} from './fields/CreateConnectionInputFields';

// wizard form data

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

export type ModelLocationData = {
  type: ModelLocationType.EXISTING | ModelLocationType.NEW | ModelLocationType.PVC;
  connectionTypeObject?: ConnectionTypeConfigMapObj;
  connection?: string;
  fieldValues: Record<string, ConnectionTypeValueType>;
  additionalFields: {
    // For S3 and OCI additional fields
    modelPath?: string;
    modelUri?: string;
    pvcConnection?: string;
  };
};

export type InitialWizardFormData = {
  modelTypeField?: ModelTypeFieldData;
  k8sNameDesc?: K8sNameDescriptionFieldData;
  externalRoute?: ExternalRouteFieldData;
  tokenAuthentication?: TokenAuthenticationFieldData;
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
  // Add more field handlers as needed
};

export type WizardFormData = {
  initialData?: InitialWizardFormData;
  state: {
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
  };
};

// extensible fields

export type DeploymentWizardFieldId =
  | 'modelAvailability'
  | 'modelServerTemplate'
  | 'modelAvailability'
  | 'externalRoute'
  | 'tokenAuth';

export type DeploymentWizardFieldBase = {
  id: DeploymentWizardFieldId;
  type: 'modifier' | 'replacement' | 'addition';
  isActive: (data: Partial<WizardFormData['state']>) => boolean;
};

export type ModifierField<T extends (...args: Parameters<T>) => ReturnType<T>> =
  DeploymentWizardFieldBase & {
    type: 'modifier';
    modifier: (stateInput: Parameters<T>, stateOutput: ReturnType<T>) => ReturnType<T>;
  };
export const isModifierField = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  field: DeploymentWizardFieldBase,
): field is ModifierField<T> => {
  return field.type === 'modifier';
};

// actual fields

export type ModelServerTemplateField = ModifierField<typeof useModelServerSelectField> & {
  id: 'modelServerTemplate';
};
export type ModelAvailabilityField = ModifierField<typeof useModelAvailabilityFields> & {
  id: 'modelAvailability';
};
export interface ExternalRouteField extends DeploymentWizardFieldBase {
  id: 'externalRoute';
  type: 'modifier';
  isVisible: boolean;
}
export interface TokenAuthField extends DeploymentWizardFieldBase {
  id: 'tokenAuth';
  type: 'modifier';
  initialValue: boolean;
}

// union type

export type DeploymentWizardField =
  | ModelServerTemplateField
  | ModelAvailabilityField
  | ExternalRouteField
  | TokenAuthField;

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
