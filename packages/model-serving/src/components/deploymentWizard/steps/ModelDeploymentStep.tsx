import React from 'react';
import { Form, FormSection, Spinner } from '@patternfly/react-core';
import K8sNameDescriptionField from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import ProjectSection from '../fields/ProjectSection';
import { ModelServingHardwareProfileSection } from '../fields/ModelServingHardwareProfileSection';
import { ModelFormatField } from '../fields/ModelFormatField';
import { NumReplicasField } from '../fields/NumReplicasField';
import { GenericFieldRenderer } from '../fields/GenericFieldRenderer';
import { ExternalDataMap } from '../ExternalDataLoader';
import { isNonSingleNodeTopologyActive } from '../topologyUtils';

const EXPLICIT_TOPOLOGY_FIELD_IDS = [
  'llmd-serving/topology-type',
  'llmd-serving/custom-topology-config',
  'llmd-serving/advanced-routing',
];

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
  const hideHwp = isNonSingleNodeTopologyActive(wizardState.state);

  const modelDeploymentExtensionFields = React.useMemo(
    () =>
      wizardState.fields.filter(
        (f) =>
          f.step === 'modelDeployment' &&
          !f.stateKey &&
          !f.parentId &&
          !EXPLICIT_TOPOLOGY_FIELD_IDS.includes(f.id),
      ),
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
          nameHelperTextAbove="This is the name of the inference service created when the model is deployed."
        />
        <GenericFieldRenderer
          fieldId="deploymentMethod"
          wizardState={wizardState}
          externalData={externalData}
          isEditing={wizardState.initialData?.isEditing}
        />
        <GenericFieldRenderer
          fieldId="llmd-serving/topology-type"
          wizardState={wizardState}
          externalData={externalData}
          isEditing={wizardState.initialData?.isEditing}
        />
        <GenericFieldRenderer
          fieldId="llmd-serving/custom-topology-config"
          wizardState={wizardState}
          externalData={externalData}
          isEditing={wizardState.initialData?.isEditing}
        />
        {!hideHwp && (
          <ModelServingHardwareProfileSection
            project={projectName}
            hardwareProfileConfig={wizardState.state.hardwareProfileConfig}
            isEditing={wizardState.initialData?.isEditing}
          />
        )}
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
        <GenericFieldRenderer
          fieldId="llmd-serving/advanced-routing"
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
