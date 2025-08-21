import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import React from 'react';
import { useModelTypeField, type ModelTypeFieldData } from './fields/ModelTypeSelectField';
import { ModelNameInputData, useModelName } from './fields/ModelNameInputField';
import { ModelResourceType } from '../../../extension-points';

export type UseModelDeploymentWizardProps = {
  modelTypeField?: ModelTypeFieldData;
  setModelType?: (data: ModelTypeFieldData) => void;
  deploymentName?: ModelNameInputData;
  setDeploymentName?: (data: ModelNameInputData) => void;
  // Add more field handlers as needed
};
export const useModelDeploymentWizard = (
  existingData?: UseModelDeploymentWizardProps,
): UseModelDeploymentWizardProps => {
  const [modelType, setModelType] = useModelTypeField(existingData?.modelTypeField);
  const [deploymentName, setDeploymentName] = useModelName(existingData?.deploymentName);

  return {
    modelTypeField: modelType,
    setModelType,
    deploymentName,
    setDeploymentName,
  };
};
