import React from 'react';
import { z } from 'zod';
import { Form } from '@patternfly/react-core';
import type { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { modelTypeSelectFieldSchema, ModelTypeSelectField } from '../fields/ModelTypeSelectField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

export const modelSourceStepSchema = z.object({
  modelType: modelTypeSelectFieldSchema,
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
      <ModelTypeSelectField
        modelType={wizardState.state.modelType.data}
        setModelType={wizardState.state.modelType.setData}
        validationProps={validation.getFieldValidationProps(['modelType'])}
        validationIssues={validation.getFieldValidation(['modelType'])}
      />
    </Form>
  );
};
