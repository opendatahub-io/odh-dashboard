import { useModelTypeField, type ModelTypeFieldData } from './fields/ModelTypeSelectField';

export type ModelDeploymentWizardData = {
  modelTypeField?: ModelTypeFieldData;
};

export type ModelDeploymentWizardDataHandlers = {
  setModelType: (data: ModelTypeFieldData) => void;
};

export type UseModelDeploymentWizardState = {
  data: ModelDeploymentWizardData;
  handlers: ModelDeploymentWizardDataHandlers;
};

export const useModelDeploymentWizard = (
  existingData?: ModelDeploymentWizardData,
): UseModelDeploymentWizardState => {
  const [modelType, setModelType] = useModelTypeField(existingData?.modelTypeField);

  return {
    data: {
      modelTypeField: modelType,
    },
    handlers: {
      setModelType,
    },
  };
};
