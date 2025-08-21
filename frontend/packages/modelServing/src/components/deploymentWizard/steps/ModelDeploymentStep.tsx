import React from 'react';
import { z } from 'zod';
import {
  Form,
  FormSection,
  useWizardContext,
  useWizardFooter,
  WizardFooter,
} from '@patternfly/react-core';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { UseModelDeploymentWizardProps } from '../useDeploymentWizard';
import ProjectSection from '../fields/ProjectSection';
import { ModelNameInputField, modelNameInputFieldSchema } from '../fields/ModelNameInputField';

const modelDeploymentStepSchema = z.object({
  deploymentName: modelNameInputFieldSchema,
});

export type ModelDeploymentStepData = z.infer<typeof modelDeploymentStepSchema>;

type ModelDeploymentStepProps = {
  projectName: string;
  wizardData: UseModelDeploymentWizardProps;
};

export const ModelDeploymentStepContent: React.FC<ModelDeploymentStepProps> = ({
  projectName,
  wizardData,
}) => {
  const { activeStep, goToNextStep, goToPrevStep, close } = useWizardContext();

  const { data: deploymentName, onDataChange: setDeploymentName } = useK8sNameDescriptionFieldData({
    initialData: wizardData.deploymentName,
  });

  const [showNonEmptyNameWarning, setShowNonEmptyNameWarning] = React.useState(false);

  const validationData: Partial<ModelDeploymentStepData> = React.useMemo(
    () => ({
      deploymentName: wizardData.deploymentName,
    }),
    [wizardData.deploymentName],
  );

  const { markFieldTouched, getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    validationData,
    modelDeploymentStepSchema,
  );

  useWizardFooter(
    <WizardFooter
      activeStep={activeStep}
      onNext={() => {
        if (isK8sNameDescriptionDataValid(deploymentName)) {
          setShowNonEmptyNameWarning(false);
          goToNextStep();
        }
        setShowNonEmptyNameWarning(true);
      }}
      onBack={goToPrevStep}
      isBackDisabled={activeStep.index === 1}
      onClose={close}
      nextButtonText="Next"
    />,
  );

  return (
    <Form>
      <FormSection title="Model deployment">
        {projectName && <ProjectSection projectName={projectName} />}
        <ModelNameInputField
          deploymentName={wizardData.deploymentName}
          setDeploymentName={wizardData.setDeploymentName}
          showNonEmptyNameWarning={showNonEmptyNameWarning}
        />
      </FormSection>
    </Form>
  );
};
