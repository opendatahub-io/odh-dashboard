import type { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import type {
  ModelServerOption,
  useModelServerSelectField,
} from './fields/ModelServerTemplateSelectField';
import type { useModelTypeField } from './fields/ModelTypeSelectField';
import type { useExternalRouteField } from './fields/ExternalRouteField';
import type { ModelDeploymentWizardData } from './useDeploymentWizard';
import type { useAvailableAiAssetsFields } from './fields/AvailableAiAssetsFields';
import type { useEnvironmentVariablesField } from './fields/EnvironmentVariablesField';
import type { useModelFormatField } from './fields/ModelFormatField';
import type { useModelLocationData } from './fields/ModelLocationInputFields';
import type { useNumReplicasField } from './fields/NumReplicasField';
import type { useRuntimeArgsField } from './fields/RuntimeArgsField';
import type { useTokenAuthenticationField } from './fields/TokenAuthenticationField';
import { useCreateConnectionData } from './fields/CreateConnectionInputFields';

// extensible fields

export type DeploymentWizardFieldId =
  | 'modelType'
  | 'modelServerTemplate'
  | 'externalRoute'
  | 'tokenAuth';

export type FieldExtensionContext = {
  modelType: ServingRuntimeModelType;
  selectedModelServer?: ModelServerOption;
};

export interface DeploymentWizardFieldBase {
  id: DeploymentWizardFieldId;
  type: 'modifier' | 'replacement' | 'addition';
}

export interface ModelServerTemplateField extends DeploymentWizardFieldBase {
  id: 'modelServerTemplate';
  type: 'modifier';
  modelServerTemplates: ModelServerOption[];
  isActive: (modelType: ServingRuntimeModelType) => boolean;
}

export interface ExternalRouteField extends DeploymentWizardFieldBase {
  id: 'externalRoute';
  type: 'modifier';
  isVisible: boolean;
  isActive: (context: FieldExtensionContext) => boolean;
}

export interface TokenAuthField extends DeploymentWizardFieldBase {
  id: 'tokenAuth';
  type: 'modifier';
  initialValue: boolean;
  isActive: (context: FieldExtensionContext) => boolean;
}

// Union type approach - just add new field types to this union
export type DeploymentWizardField = ModelServerTemplateField | ExternalRouteField | TokenAuthField;

export const isModelServerTemplateField = (
  field: DeploymentWizardField,
): field is ModelServerTemplateField => {
  return field.id === 'modelServerTemplate';
};

export const isExternalRouteField = (field: DeploymentWizardField): field is ExternalRouteField => {
  return field.id === 'externalRoute';
};

export const isTokenAuthField = (field: DeploymentWizardField): field is TokenAuthField => {
  return field.id === 'tokenAuth';
};

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
    aiAssetData: ReturnType<typeof useAvailableAiAssetsFields>;
    modelServer: ReturnType<typeof useModelServerSelectField>;
    createConnectionData: ReturnType<typeof useCreateConnectionData>;
  };
};
