import React from 'react';
import { Alert, Form, FormSection, Spinner } from '@patternfly/react-core';
import { ProjectKind } from '#~/k8sTypes';
import ContentModal from '#~/components/modals/ContentModal';
import ProjectSelector from '#~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSelector';
import ManageKServeModal from '#~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '#~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '#~/types';
import ModelServingContextProvider, {
  ModelServingContext,
} from '#~/pages/modelServing/ModelServingContext';
import { getKServeTemplates } from '#~/pages/modelServing/customServingRuntimes/utils';
import { isRedHatRegistryUri } from '#~/concepts/modelRegistry/utils';
import useServingConnections from '#~/pages/projects/screens/detail/connections/useServingConnections';
import { isOciModelUri } from '#~/pages/modelServing/utils';
import { ModelDeployPrefillInfo } from './usePrefillModelDeployModal';

interface DeployPrefilledModelModalProps {
  modelDeployPrefillInfo: ModelDeployPrefillInfo;
  prefillInfoLoaded: boolean;
  prefillInfoLoadError?: Error;
  onCancel: () => void;
  onSubmit?: (selectedProject: ProjectKind) => void;
}

const DeployPrefilledModelModal: React.FC<DeployPrefilledModelModalProps> = (props) => {
  const [selectedProject, setSelectedProject] = React.useState<ProjectKind | null>(null);
  return (
    <ModelServingContextProvider namespace={selectedProject?.metadata.name}>
      <DeployPrefilledModelModalContents
        {...props}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
      />
    </ModelServingContextProvider>
  );
};

const DeployPrefilledModelModalContents: React.FC<
  DeployPrefilledModelModalProps & {
    selectedProject: ProjectKind | null;
    setSelectedProject: (project: ProjectKind | null) => void;
  }
> = ({
  modelDeployPrefillInfo,
  prefillInfoLoaded,
  prefillInfoLoadError,
  onCancel,
  onSubmit,
  selectedProject,
  setSelectedProject,
}) => {
  const {
    servingRuntimeTemplates: [templates, templatesLoaded],
    servingRuntimeTemplateOrder: { data: templateOrder, loaded: templateOrderLoaded },
    servingRuntimeTemplateDisablement: {
      data: templateDisablement,
      loaded: templateDisablementLoaded,
    },
  } = React.useContext(ModelServingContext);
  const servingContextLoaded = templatesLoaded && templateOrderLoaded && templateDisablementLoaded;

  const servingPlatformStatuses = useServingPlatformStatuses();
  const { platform, error: platformError } = getProjectModelServingPlatform(
    selectedProject,
    servingPlatformStatuses,
  );
  const [connections] = useServingConnections(selectedProject?.metadata.name);
  const isOciModel = isOciModelUri(modelDeployPrefillInfo.modelArtifactUri);
  const platformToUse = platform || (isOciModel ? ServingRuntimePlatform.SINGLE : undefined);

  const loaded = servingContextLoaded && prefillInfoLoaded;
  const loadError = prefillInfoLoadError; // Note: serving context load errors are handled/rendered in ModelServingContextProvider

  const handleSubmit = React.useCallback(async () => {
    if (selectedProject) {
      onSubmit?.(selectedProject);
    }
  }, [onSubmit, selectedProject]);

  const onClose = React.useCallback(
    (submit: boolean) => {
      if (submit) {
        handleSubmit();
      }
      setSelectedProject(null);
      onCancel();
    },
    [handleSubmit, onCancel, setSelectedProject],
  );

  const projectSection = (
    <ProjectSelector
      selectedProject={selectedProject}
      setSelectedProject={setSelectedProject}
      error={platformError}
    />
  );

  if (!selectedProject || !platformToUse) {
    const modalForm = (
      <Form>
        {loadError ? (
          <Alert variant="danger" isInline title={loadError.name}>
            {loadError.message}
          </Alert>
        ) : !loaded ? (
          <Spinner />
        ) : isOciModel ? (
          <FormSection title="Model deployment">
            <Alert
              data-testid="oci-deploy-kserve-alert"
              variant="info"
              isInline
              title="This model uses an OCI storage location which supports deploying to only the single-model serving platform."
            />
            {projectSection}
          </FormSection>
        ) : (
          <FormSection title="Model deployment">{projectSection}</FormSection>
        )}
      </Form>
    );

    return (
      <ContentModal
        title="Deploy model"
        description="Configure properties for deploying your model"
        onClose={() => onClose(false)}
        contents={modalForm}
        buttonActions={[
          {
            label: 'Deploy',
            onClick: () => onClose(true),
            variant: 'primary',
            isDisabled: true,
            dataTestId: 'deploy-button',
          },
          {
            label: 'Cancel',
            onClick: () => onClose(false),
            variant: 'link',
            dataTestId: 'cancel-button',
          },
        ]}
      />
    );
  }

  return (
    <ManageKServeModal
      onClose={onClose}
      servingRuntimeTemplates={getKServeTemplates(templates, templateOrder, templateDisablement)}
      shouldFormHidden={!!platformError}
      modelDeployPrefillInfo={modelDeployPrefillInfo}
      projectContext={{ currentProject: selectedProject, connections }}
      projectSection={projectSection}
      existingUriOption={
        modelDeployPrefillInfo.modelArtifactUri &&
        isRedHatRegistryUri(modelDeployPrefillInfo.modelArtifactUri)
          ? modelDeployPrefillInfo.modelArtifactUri
          : undefined
      }
    />
  );
};

export default DeployPrefilledModelModal;
