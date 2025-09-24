import React from 'react';
import { z } from 'zod';
import { Form } from '@patternfly/react-core';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { modelTypeSelectFieldSchema, ModelTypeSelectField } from '../fields/ModelTypeSelectField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import { ModelLocationSelectField } from '../fields/ModelLocationSelectField';
import { isValidModelLocationData } from '../fields/ModelLocationInputFields';
import { ModelLocationData } from '../fields/modelLocationFields/types';

// Schema
export const modelSourceStepSchema = z.object({
  modelType: modelTypeSelectFieldSchema,
  modelLocationData: z.custom<ModelLocationData>((val) => {
    if (!val) return false;
    return isValidModelLocationData(val.type, val);
  }),
});

export type ModelSourceStepData = z.infer<typeof modelSourceStepSchema>;

type ModelSourceStepProps = {
  wizardState: UseModelDeploymentWizardState;
  validation: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
};

export const ModelSourceStepContent: React.FC<ModelSourceStepProps> = ({
  wizardState,
  validation,
}) => {
  return (
    <Form>
      <ModelLocationSelectField
        modelLocation={wizardState.state.modelLocationData.data?.type}
        validationProps={validation.getFieldValidationProps(['modelLocation', 'modelLocationData'])}
        validationIssues={validation.getFieldValidation(['modelLocation', 'modelLocationData'])}
        project={wizardState.state.modelLocationData.project}
        modelLocationData={wizardState.state.modelLocationData.data}
        setModelLocationData={wizardState.state.modelLocationData.setData}
        resetModelLocationData={() => wizardState.state.modelLocationData.setData(undefined)}
      />
      <ModelTypeSelectField
        modelType={wizardState.state.modelType.data}
        setModelType={wizardState.state.modelType.setData}
        validationProps={validation.getFieldValidationProps(['modelType'])}
        validationIssues={validation.getFieldValidation(['modelType'])}
        isEditing={wizardState.initialData?.isEditing}
      />
    </Form>
  );
};
