import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormSection,
} from '@patternfly/react-core';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import ProjectSelector from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSelector';
import useServingConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useServingConnections';
import { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { isOciModelUri } from '@odh-dashboard/internal/pages/modelServing/utils';
import { getConnectionTypeRef } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import useRegistryConnections from './useRegistryConnections';
import { useExtractFormDataFromRegistry } from './useExtractFormDataFromRegistry';
import { useNavigateToDeploymentWizard } from '../src/components/deploymentWizard/useNavigateToDeploymentWizard';
import { ExistingConnectionField } from '../src/components/deploymentWizard/fields/modelLocationFields/ExistingConnectionField';
import {
  InitialWizardFormData,
  ModelLocationData,
  ModelLocationType,
} from '../src/components/deploymentWizard/types';

export type PreWizardDeployModalProps = {
  modelDeployPrefill: {
    data: ModelDeployPrefillInfo;
    loaded: boolean;
    error: Error | undefined;
  };
  onClose: () => void;
};

export const PreWizardDeployModal: React.FC<PreWizardDeployModalProps> = ({
  modelDeployPrefill,
  onClose,
}) => {
  const { loadError: projectsLoadError } = React.useContext(ProjectsContext);
  const [selectedProject, setSelectedProject] = React.useState<ProjectKind | null>(null);
  const [selectedConnection, setSelectedConnection] = React.useState<Connection | undefined>(
    undefined,
  );

  const [connections] = useServingConnections(selectedProject?.metadata.name);

  const matchedConnections = useRegistryConnections(
    modelDeployPrefill.data.modelArtifactUri,
    connections,
  );

  const [connectionTypes] = useWatchConnectionTypes(true);

  // Extract form data from registry using the hook
  const { formData: registryFormData } = useExtractFormDataFromRegistry(modelDeployPrefill);

  const isOciModel = isOciModelUri(modelDeployPrefill.data.modelArtifactUri);

  // Auto-select connection if there's exactly one match
  React.useEffect(() => {
    if (matchedConnections.length === 1 && !selectedConnection) {
      setSelectedConnection(matchedConnections[0]);
    } else if (matchedConnections.length !== 1 && selectedConnection) {
      // If we had a single match but now there are multiple or none, clear selection
      // unless the selected connection is still in the matched list
      if (!matchedConnections.includes(selectedConnection)) {
        setSelectedConnection(undefined);
      }
    }
  }, [matchedConnections, selectedConnection]);

  const navigateToWizard = useNavigateToDeploymentWizard();

  const handleDeploy = React.useCallback(() => {
    if (!selectedProject || !registryFormData) return;

    // Start with form data from the registry hook
    const initialData: InitialWizardFormData = { ...registryFormData };

    // If a connection is selected, override the model location data to use existing connection
    if (selectedConnection && modelDeployPrefill.data.modelArtifactUri) {
      const connectionTypeRef = getConnectionTypeRef(selectedConnection);
      const connectionTypeObject = connectionTypes.find(
        (ct) => ct.metadata.name === connectionTypeRef,
      );

      const modelLocationData: ModelLocationData = {
        type: ModelLocationType.EXISTING,
        connection: selectedConnection.metadata.name,
        connectionTypeObject,
        fieldValues: {},
        additionalFields: {
          modelUri: modelDeployPrefill.data.modelArtifactUri,
        },
      };
      initialData.modelLocationData = modelLocationData;
      initialData.initSelectedConnection = {
        connection: selectedConnection,
      };
    }

    navigateToWizard(selectedProject.metadata.name, initialData);
  }, [
    selectedProject,
    selectedConnection,
    registryFormData,
    modelDeployPrefill.data.modelArtifactUri,
    connectionTypes,
    navigateToWizard,
  ]);

  // Determine if we should show connection selection field
  // Show it only when there are 2 or more matched connections
  const showConnectionSelection = matchedConnections.length >= 2;

  // Determine if submit button should be enabled
  // Enable when: project is selected AND (0 matches OR 1 match OR 2+ matches with selection)
  const canSubmit =
    selectedProject &&
    (matchedConnections.length === 0 ||
      matchedConnections.length === 1 ||
      (matchedConnections.length >= 2 && selectedConnection !== undefined));

  return (
    <Modal variant="medium" isOpen onClose={onClose}>
      <ModalHeader
        title="Deploy model"
        description="Select a project and connection to deploy your model from the model registry"
      />
      <ModalBody>
        <Form>
          <FormSection title="Project selection">
            <ProjectSelector
              selectedProject={selectedProject}
              setSelectedProject={(project) => {
                setSelectedProject(project);
                setSelectedConnection(undefined);
              }}
              error={projectsLoadError}
              projectLinkExtraUrlParams={
                modelDeployPrefill.data.modelRegistryInfo
                  ? {
                      modelRegistryName: modelDeployPrefill.data.modelRegistryInfo.mrName,
                      registeredModelId:
                        modelDeployPrefill.data.modelRegistryInfo.registeredModelId,
                      modelVersionId: modelDeployPrefill.data.modelRegistryInfo.modelVersionId,
                    }
                  : undefined
              }
              isOciModel={isOciModel}
            />
          </FormSection>
          {selectedProject && showConnectionSelection && (
            <FormSection title="Connection selection">
              <ExistingConnectionField
                connectionTypes={connectionTypes}
                projectConnections={matchedConnections}
                onSelect={(connection) => {
                  setSelectedConnection(connection);
                }}
                selectedConnection={selectedConnection}
              />
            </FormSection>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleDeploy}
          isDisabled={!canSubmit}
          data-testid="deploy-button"
        >
          Deploy
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
