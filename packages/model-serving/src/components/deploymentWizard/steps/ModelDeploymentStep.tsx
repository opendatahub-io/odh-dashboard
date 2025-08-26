import React from 'react';
// import { z } from 'zod';
import { Form, FormSection } from '@patternfly/react-core';
import K8sNameDescriptionField from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import ProjectSection from '../fields/ProjectSection';
// import { deploymentNameInputFieldSchema } from '../fields/ModelNameInputField';

// export const modelDeploymentStepSchema = z.object({
//   deploymentName: deploymentNameInputFieldSchema,
// });

// export type ModelDeploymentStepData = z.infer<typeof modelDeploymentStepSchema>;

type ModelDeploymentStepProps = {
  projectName: string;
  wizardState: UseModelDeploymentWizardState;
  // validation: ReturnType<typeof useZodFormValidation<ModelDeploymentStepData>>;
};

export const ModelDeploymentStepContent: React.FC<ModelDeploymentStepProps> = ({
  projectName,
  wizardState,
  // validation,
}) => {
  return (
    <Form>
      <FormSection title="Model deployment">
        {projectName && <ProjectSection projectName={projectName} />}
        {/* {isK8sNameDescriptionFieldData(wizardState.data.k8sNameDesc) && (
          <ModelNameInputField
            deploymentName={wizardState.data.k8sNameDesc}
            setDeploymentName={wizardState.handlers.setDeploymentName}
            // validation={validation}
          />
        )} */}
        {wizardState.data.k8sNameDesc && (
          <K8sNameDescriptionField
            dataTestId="model-deployment-name"
            data={wizardState.data.k8sNameDesc}
            onDataChange={wizardState.handlers.setDeploymentName}
          />
        )}
      </FormSection>
    </Form>
  );
};
