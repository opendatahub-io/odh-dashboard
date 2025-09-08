import { K8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import { useModelTypeField, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import { useModelFormatField } from './fields/ModelFormatField';

export type ModelDeploymentWizardData = {
  modelTypeField?: ModelTypeFieldData;
  k8sNameDesc?: K8sNameDescriptionFieldData;
  hardwareProfile?: Parameters<typeof useHardwareProfileConfig>;
  modelFormat?: SupportedModelFormats;
};

export type UseModelDeploymentWizardState = {
  initialData?: ModelDeploymentWizardData;
  state: {
    modelType: ReturnType<typeof useModelTypeField>;
    k8sNameDesc: ReturnType<typeof useK8sNameDescriptionFieldData>;
    hardwareProfileConfig: ReturnType<typeof useHardwareProfileConfig>;
    modelFormatState: ReturnType<typeof useModelFormatField>;
  };
};

export const useModelDeploymentWizard = (
  initialData?: ModelDeploymentWizardData,
): UseModelDeploymentWizardState => {
  // Step 1: Model Source
  const modelType = useModelTypeField(initialData?.modelTypeField);

  // Step 2: Model Deployment
  const k8sNameDesc = useK8sNameDescriptionFieldData({
    initialData: extractK8sNameDescriptionFieldData(initialData?.k8sNameDesc),
  });
  const hardwareProfileConfig = useHardwareProfileConfig(...(initialData?.hardwareProfile ?? []));
  const modelFormatState = useModelFormatField(initialData?.modelFormat, modelType.data);

  // Step 3: Advanced Options

  // Step 4: Summary

  return {
    initialData,
    state: {
      modelType,
      k8sNameDesc,
      hardwareProfileConfig,
      modelFormatState,
    },
  };
};
