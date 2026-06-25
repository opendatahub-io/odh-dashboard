import React from 'react';
import { Form, FormSection, Spinner } from '@patternfly/react-core';
import K8sNameDescriptionField from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import ProjectSection from '../fields/ProjectSection';
import { ModelServingHardwareProfileSection } from '../fields/ModelServingHardwareProfileSection';
import { ModelFormatField } from '../fields/ModelFormatField';
import { NumReplicasField } from '../fields/NumReplicasField';
import { GenericFieldRenderer } from '../fields/GenericFieldRenderer';
import { ExternalDataMap } from '../ExternalDataLoader';

type ModelDeploymentStepProps = {
  projectName?: string;
  wizardState: UseModelDeploymentWizardState;
  externalData?: ExternalDataMap;
  hideProjectSection?: boolean;
};

export const ModelDeploymentStepContent: React.FC<ModelDeploymentStepProps> = ({
  projectName,
  wizardState,
  externalData,
  hideProjectSection,
}) => {
  const modelDeploymentExtensionFields = React.useMemo(
    () =>
      wizardState.fields.filter((f) => f.step === 'modelDeployment' && !f.stateKey && !f.parentId),
    [wizardState.fields],
  );

  if (!wizardState.loaded.modelDeploymentLoaded) {
    return <Spinner data-testid="spinner" />;
  }

  return (
    <Form>
      <FormSection title="Model deployment">
        {/* TODO remove ProjectSection and the hideProjectSection prop when PreconfigureDeploymentStep becomes unconditional */}
        {!hideProjectSection && (
          <ProjectSection
            initialProjectName={wizardState.state.project.initialProjectName}
            projectName={wizardState.state.project.projectName}
            setProjectName={wizardState.state.project.setProjectName}
          />
        )}
        <K8sNameDescriptionField
          data={wizardState.state.k8sNameDesc.data}
          onDataChange={wizardState.state.k8sNameDesc.onDataChange}
          dataTestId="model-deployment"
          nameLabel="Model deployment name"
          nameHelperTextAbove="Name this deployment. This name is also used for the inference service created when the model is deployed."
        />
        <GenericFieldRenderer
          fieldId="deploymentMethod"
          wizardState={wizardState}
          externalData={externalData}
          isEditing={wizardState.initialData?.isEditing}
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
        <GenericFieldRenderer
          stateKey="modelServer"
          wizardState={wizardState}
          externalData={externalData}
          isEditing={wizardState.initialData?.isEditing}
        />
        <NumReplicasField replicaState={wizardState.state.numReplicas} />
        {modelDeploymentExtensionFields.map((field) => (
          <GenericFieldRenderer
            key={field.id}
            fieldId={field.id}
            wizardState={wizardState}
            externalData={externalData}
            isEditing={wizardState.initialData?.isEditing}
          />
        ))}
      </FormSection>
    </Form>
  );
};
