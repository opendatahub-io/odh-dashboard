import React from 'react';
import { Form, FormSection } from '@patternfly/react-core';
import K8sNameDescriptionField from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { useProfileIdentifiers } from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import ProjectSection from '../fields/ProjectSection';
import { ModelServingHardwareProfileSection } from '../fields/ModelServingHardwareProfileSection';
import { ModelFormatField } from '../fields/ModelFormatField';
import { NumReplicasField } from '../fields/NumReplicasField';
import ModelServerTemplateSelectField from '../fields/ModelServerTemplateSelectField';

type ModelDeploymentStepProps = {
  projectName?: string;
  wizardState: UseModelDeploymentWizardState;
};

export const ModelDeploymentStepContent: React.FC<ModelDeploymentStepProps> = ({
  projectName,
  wizardState,
}) => {
  const profileIdentifiers = useProfileIdentifiers(
    wizardState.state.hardwareProfileConfig.formData.selectedProfile,
  );

  return (
    <Form>
      <FormSection title="Model deployment">
        <ProjectSection
          initialProjectName={wizardState.state.project.initialProjectName}
          projectName={wizardState.state.project.projectName}
          setProjectName={wizardState.state.project.setProjectName}
        />
        <K8sNameDescriptionField
          data={wizardState.state.k8sNameDesc.data}
          onDataChange={wizardState.state.k8sNameDesc.onDataChange}
          dataTestId="model-deployment"
          nameLabel="Model deployment name"
          nameHelperTextAbove="Name this deployment. This name is also used for the inference service created when the model is deployed."
        />
        <ModelServingHardwareProfileSection
          project={projectName}
          hardwareProfileConfig={wizardState.state.hardwareProfileConfig}
          isEditing={wizardState.initialData?.isEditing}
        />
        {wizardState.state.modelFormatState.isVisible && (
          <ModelFormatField
            modelFormatState={wizardState.state.modelFormatState}
            isEditing={wizardState.initialData?.isEditing}
          />
        )}
        <ModelServerTemplateSelectField
          modelServerState={wizardState.state.modelServer}
          profileIdentifiers={profileIdentifiers}
          modelFormat={wizardState.state.modelFormatState.modelFormat}
          modelType={wizardState.state.modelType.data}
          isEditing={wizardState.initialData?.isEditing}
        />
        <NumReplicasField replicaState={wizardState.state.numReplicas} />
      </FormSection>
    </Form>
  );
};
