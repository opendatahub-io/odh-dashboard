import React from 'react';
import { Form, FormSection } from '@patternfly/react-core';
import K8sNameDescriptionField from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import ProjectSection from '../fields/ProjectSection';
import { ModelServingHardwareProfileSection } from '../fields/ModelServingHardwareProfileSection';

type ModelDeploymentStepProps = {
  projectName: string;
  wizardState: UseModelDeploymentWizardState;
};

export const ModelDeploymentStepContent: React.FC<ModelDeploymentStepProps> = ({
  projectName,
  wizardState,
}) => {
  return (
    <Form>
      <FormSection title="Model deployment">
        {projectName && <ProjectSection projectName={projectName} />}
        <K8sNameDescriptionField
          data={wizardState.state.k8sNameDesc.data}
          onDataChange={wizardState.state.k8sNameDesc.onDataChange}
          dataTestId="model-deployment"
          nameLabel="Model deployment name"
          nameHelperText="This is the name of the inference service created when the model is deployed." // TODO: make this non-Kserve specific
          hideDescription
        />
        <ModelServingHardwareProfileSection
          project={projectName}
          hardwareProfileConfig={wizardState.state.hardwareProfileConfig}
          isEditing={false}
        />
      </FormSection>
    </Form>
  );
};
