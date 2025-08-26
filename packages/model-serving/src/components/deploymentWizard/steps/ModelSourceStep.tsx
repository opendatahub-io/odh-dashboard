import React from 'react';
import { z } from 'zod';
import { Form } from '@patternfly/react-core';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { modelTypeSelectFieldSchema, ModelTypeSelectField } from '../fields/ModelTypeSelectField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import {
  ModelLocationSelectField,
  modelLocationSelectFieldSchema,
} from '../fields/ModelLocationSelectField';
import { isValidModelLocationData } from '../fields/ModelLocationInputFields';

// Schema
export const modelSourceStepSchema = z
  .object({
    modelType: modelTypeSelectFieldSchema,
    modelLocation: modelLocationSelectFieldSchema,
    modelLocationData: z.any(),
  })
  .refine(
    // To validate modelLocationData, we need to validate based on the modelLocation type.
    (data) => {
      return isValidModelLocationData(data.modelLocation, data.modelLocationData);
    },
    {
      message: 'Invalid model location data for selected type',
      path: ['modelLocationData'],
    },
  );

export type ModelSourceStepData = z.infer<typeof modelSourceStepSchema>;

type ModelSourceStepProps = {
  wizardState: UseModelDeploymentWizardState;
  validation: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  project: ProjectKind | null;
};

export const ModelSourceStepContent: React.FC<ModelSourceStepProps> = ({
  wizardState,
  validation,
  project,
}) => {
  return (
    <Form>
      <ModelLocationSelectField
        modelLocation={wizardState.state.modelLocationField.data}
        setModelLocation={wizardState.state.modelLocationField.setData}
        validationProps={validation.getFieldValidationProps(['modelLocation', 'modelLocationData'])}
        validationIssues={validation.getFieldValidation(['modelLocation', 'modelLocationData'])}
        project={project}
        setModelLocationData={wizardState.state.modelLocationData.setData}
        resetModelLocationData={() => wizardState.state.modelLocationData.setData(undefined)}
        modelLocationData={wizardState.state.modelLocationData.data}
      />
      <ModelTypeSelectField
        modelType={wizardState.state.modelType.data}
        setModelType={wizardState.state.modelType.setData}
        validationProps={validation.getFieldValidationProps(['modelType'])}
        validationIssues={validation.getFieldValidation(['modelType'])}
      />
    </Form>
  );
};
