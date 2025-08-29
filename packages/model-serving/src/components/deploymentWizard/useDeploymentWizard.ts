import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { extractK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useModelTypeField, type ModelTypeFieldData } from './fields/ModelTypeSelectField';

export type ModelDeploymentWizardData = {
  modelTypeField?: ModelTypeFieldData;
  k8sNameDesc?: K8sNameDescriptionFieldData;
};

export type ModelDeploymentWizardDataHandlers = {
  setModelType: (data: ModelTypeFieldData) => void;
  setDeploymentName?: K8sNameDescriptionFieldUpdateFunction;
};

export type UseModelDeploymentWizardState = {
  data: ModelDeploymentWizardData;
  handlers: ModelDeploymentWizardDataHandlers;
};

export const useModelDeploymentWizard = (
  existingData?: ModelDeploymentWizardData,
): UseModelDeploymentWizardState => {
  const [modelType, setModelType] = useModelTypeField(existingData?.modelTypeField);
  const { data: k8sNameDesc, onDataChange: setDeploymentName } = useK8sNameDescriptionFieldData({
    initialData: extractK8sNameDescriptionFieldData(existingData?.k8sNameDesc),
  });

  return {
    data: {
      modelTypeField: modelType,
      k8sNameDesc,
    },
    handlers: {
      setModelType,
      setDeploymentName,
    },
  };
};
