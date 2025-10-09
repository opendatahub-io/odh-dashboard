import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import type { useModelServerSelectField } from './fields/ModelServerTemplateSelectField';
import type { useModelTypeField } from './fields/ModelTypeSelectField';
import type { useExternalRouteField } from './fields/ExternalRouteField';
import type { ModelDeploymentWizardData } from './useDeploymentWizard';
import type { useModelAvailabilityFields } from './fields/ModelAvailabilityFields';
import type { useEnvironmentVariablesField } from './fields/EnvironmentVariablesField';
import type { useModelFormatField } from './fields/ModelFormatField';
import type { useModelLocationData } from './fields/ModelLocationInputFields';
import type { useNumReplicasField } from './fields/NumReplicasField';
import type { useRuntimeArgsField } from './fields/RuntimeArgsField';
import type { useTokenAuthenticationField } from './fields/TokenAuthenticationField';
import { useCreateConnectionData } from './fields/CreateConnectionInputFields';

// wizard form data

export type WizardFormData = {
  initialData?: ModelDeploymentWizardData;
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

export type DeploymentWizardFieldId = 'modelAvailability' | 'modelServerTemplate';

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

// union type

export type DeploymentWizardField = ModelServerTemplateField | ModelAvailabilityField;

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
