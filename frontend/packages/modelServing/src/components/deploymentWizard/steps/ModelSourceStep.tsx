import React from 'react';
import { z } from 'zod';
import { Form, useWizardContext, useWizardFooter, WizardFooter } from '@patternfly/react-core';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { modelTypeSelectFieldSchema, ModelTypeSelectField } from '../fields/ModelTypeSelectField';
import { UseModelDeploymentWizardProps } from '../useDeploymentWizard';

const modelSourceStepSchema = z.object({
  modelType: modelTypeSelectFieldSchema,
});

export type ModelSourceStepData = z.infer<typeof modelSourceStepSchema>;

type ModelSourceStepProps = {
  wizardData: UseModelDeploymentWizardProps;
};

export const ModelSourceStepContent: React.FC<ModelSourceStepProps> = ({ wizardData }) => {
  const { activeStep, goToNextStep, goToPrevStep, close } = useWizardContext();

  const validationData: Partial<ModelSourceStepData> = React.useMemo(
    () => ({
      modelType: wizardData.modelTypeField,
    }),
    [wizardData.modelTypeField],
  );

  const { markFieldTouched, getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    validationData,
    modelSourceStepSchema,
  );

  useWizardFooter(
    <WizardFooter
      activeStep={activeStep}
      onNext={() => {
        markFieldTouched(['modelType']);
        if (getFieldValidation(['modelType'], true).length === 0) {
          goToNextStep();
        }
      }}
      onBack={goToPrevStep}
      isBackDisabled={activeStep.index === 1}
      onClose={close}
      nextButtonText="Next"
    />,
  );

  return (
    <Form>
      <ModelTypeSelectField
        modelType={wizardData.modelTypeField}
        setModelType={wizardData.setModelType}
        validationProps={getFieldValidationProps(['modelType'])}
        validationIssues={getFieldValidation(['modelType'])}
      />
    </Form>
  );
};
