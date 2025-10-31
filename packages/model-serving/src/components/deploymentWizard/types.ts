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
import {
  useCreateConnectionData,
  type CreateConnectionData,
} from './fields/CreateConnectionInputFields';
import { useProjectSection } from './fields/ProjectSection';

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
  // Add more field handlers as needed
};

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
  };
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

// extensible fields

export type DeploymentWizardFieldId =
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
// todo should extend ModifierField
export type ExternalRouteField = DeploymentWizardFieldBase & {
  id: 'externalRoute';
  type: 'modifier';
  isVisible: boolean;
};
// todo should extend ModifierField
export type TokenAuthField = DeploymentWizardFieldBase & {
  id: 'tokenAuth';
  type: 'modifier';
  initialValue: boolean;
};

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
