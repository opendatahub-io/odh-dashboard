import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { K8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types.js';
import { K8sNameDescriptionFieldUpdateFunction } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { FieldValidationProps } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import React from 'react';
import z, { ZodIssue } from 'zod';
import { ZodErrorHelperText } from '@odh-dashboard/internal/components/ZodErrorFormHelperText';
import { FormGroup } from '@patternfly/react-core';

// Schema

export const modelNameInputFieldSchema = z.object({
  name: z.string(),
  k8sName: z.string(),
});

export type ModelNameInputData = z.infer<typeof modelNameInputFieldSchema>;

// Hooks

export type ModelNameField = [
  data: ModelNameInputData | undefined,
  setData: (data: ModelNameInputData) => void,
];

export const useModelName = (existingData?: ModelNameInputData): ModelNameField => {
  const [modelName, setModelName] = React.useState<ModelNameInputData | undefined>(existingData);

  // Needed this callback to update the modelName when existingData finishes loading
  React.useCallback(() => {
    setModelName(existingData);
  }, [existingData]);

  console.log(modelName, existingData);

  return [modelName, setModelName];
};

// Component

type ModelNameInputFieldProps = {
  deploymentName?: ModelNameInputData;
  setDeploymentName?: (data: ModelNameInputData) => void;
  showNonEmptyNameWarning?: boolean;
};

export const ModelNameInputField: React.FC<ModelNameInputFieldProps> = ({
  deploymentName,
  setDeploymentName,
  showNonEmptyNameWarning,
}) => {
  const { data: deploymentNameData, onDataChange: setDeploymentNameData } =
    useK8sNameDescriptionFieldData({
      initialData: deploymentName,
    });

  // Create a wrapper function that handles the key-value updates and calls setDeploymentName
  const handleDataChange = React.useCallback(
    (key: keyof K8sNameDescriptionFieldData, value: string) => {
      setDeploymentNameData(key, value);

      // Convert and call the parent's setDeploymentName if provided
      if (setDeploymentName) {
        // Get the updated data after the change
        const updatedData = {
          ...deploymentNameData,
          [key]: key === 'k8sName' ? value : value,
        };

        setDeploymentName({
          name: updatedData.name,
          k8sName: updatedData.k8sName.value,
        });
      }
    },
    [setDeploymentNameData, setDeploymentName, deploymentNameData],
  );

  return (
    <FormGroup fieldId="model-name-input" isRequired>
      <K8sNameDescriptionField
        data={deploymentNameData}
        onDataChange={handleDataChange}
        dataTestId="model-name"
        nameLabel="Model name"
        nameHelperText="This is the name of the inference service created when the model is deployed." // TODO: fix to be not KServe specific
        hideDescription
        showNonEmptyNameWarning={
          showNonEmptyNameWarning && deploymentNameData.name.trim().length === 0
        }
      />
    </FormGroup>
  );
};
