import { useModelTypeField, type ModelTypeFieldData } from './fields/ModelTypeSelectField';

export type UseModelDeploymentWizardProps = {
  modelTypeField?: ModelTypeFieldData;
  setModelType: (data: ModelTypeFieldData) => void;
  // Add more field handlers as needed
};
export const useModelDeploymentWizard = (
  existingData?: UseModelDeploymentWizardProps,
): UseModelDeploymentWizardProps => {
  const [modelType, setModelType] = useModelTypeField(existingData?.modelTypeField);

  return {
    modelTypeField: modelType,
    setModelType,
  };
};
