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

// extensible fields

export type DeploymentWizardFieldId = 'modelType' | 'modelServerTemplate';

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

// Future field types can be added here easily:
// export interface ModelTypeField extends DeploymentWizardFieldBase {
//   id: 'modelType';
//   type: 'replacement';
//   isActive: (someOtherParam: string) => boolean;
// }

// Union type approach - just add new field types to this union
export type DeploymentWizardField = ModelServerTemplateField;
// | ModelTypeField  // Add future field types here
// | SomeOtherField;

export const isModelServerTemplateField = (
  field: DeploymentWizardField,
): field is ModelServerTemplateField => {
  // return field.id === 'modelServerTemplate';
  return true; // Currently only ModelServerTemplateField exists
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
    AiAssetData: ReturnType<typeof useAvailableAiAssetsFields>;
    modelServer: ReturnType<typeof useModelServerSelectField>;
  };
};
