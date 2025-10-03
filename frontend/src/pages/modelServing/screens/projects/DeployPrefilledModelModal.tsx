import React from 'react';
import {
  Alert,
  Button,
  Form,
  FormSection,
  Spinner,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { ProjectKind } from '#~/k8sTypes';
import useProjectErrorForPrefilledModel from '#~/pages/modelServing/screens/projects/useProjectErrorForPrefilledModel';
import ProjectSelector from '#~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSelector';
import ManageKServeModal from '#~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '#~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '#~/types';
import ManageInferenceServiceModal from '#~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import ModelServingContextProvider, {
  ModelServingContext,
} from '#~/pages/modelServing/ModelServingContext';
import { getKServeTemplates } from '#~/pages/modelServing/customServingRuntimes/utils';
import { isRedHatRegistryUri } from '#~/pages/modelRegistry/screens/utils';
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
  const { loaded: projectDeployStatusLoaded, error: projectError } =
    useProjectErrorForPrefilledModel(selectedProject?.metadata.name, platformToUse);

  const error = platformError || projectError;

  const loaded = servingContextLoaded && prefillInfoLoaded;
  const loadError = prefillInfoLoadError; // Note: serving context load errors are handled/rendered in ModelServingContextProvider

  const projectLinkExtraUrlParams = React.useMemo(
    () =>
      modelDeployPrefillInfo.modelRegistryInfo
        ? {
            modelRegistryName: modelDeployPrefillInfo.modelRegistryInfo.mrName,
            registeredModelId: modelDeployPrefillInfo.modelRegistryInfo.registeredModelId,
            modelVersionId: modelDeployPrefillInfo.modelRegistryInfo.modelVersionId,
          }
        : undefined,
    [modelDeployPrefillInfo],
  );

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
      error={error}
      projectLinkExtraUrlParams={projectLinkExtraUrlParams}
      isOciModel={isOciModel}
    />
  );

  if (
    (platformToUse === ServingRuntimePlatform.MULTI && !projectDeployStatusLoaded) ||
    !selectedProject ||
    !platformToUse
  ) {
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
              title="This model uses an OCI storage location which supports deploying to only the single-model serving platform. Projects using the multi-model serving platform are excluded from the project selector."
            />
            {projectSection}
          </FormSection>
        ) : (
          <FormSection title="Model deployment">{projectSection}</FormSection>
        )}
      </Form>
    );

    return (
      <Modal variant="medium" isOpen onClose={() => onClose(false)}>
        <ModalHeader
          title="Deploy model"
          description="Configure properties for deploying your model"
        />
        <ModalBody>{modalForm}</ModalBody>
        <ModalFooter>
          {/* The Deploy button is disabled as this particular return of the Modal
          only happens when there's not a valid selected project, otherwise we'll
          render the ManageKServeModal or ManageInferenceServiceModal */}
          <Button key="deploy" variant="primary" isDisabled>
            Deploy
          </Button>
          <Button key="cancel" variant="link" onClick={() => onClose(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  if (platformToUse === ServingRuntimePlatform.SINGLE) {
    return (
      <ManageKServeModal
        onClose={onClose}
        servingRuntimeTemplates={getKServeTemplates(templates, templateOrder, templateDisablement)}
        shouldFormHidden={!!error}
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
  }
  // platform === ServingRuntimePlatform.MULTI
  return (
    <ManageInferenceServiceModal
      onClose={onClose}
      shouldFormHidden={!!error}
      modelDeployPrefillInfo={modelDeployPrefillInfo}
      projectContext={{ currentProject: selectedProject, connections }}
      projectSection={projectSection}
    />
  );
};

export default DeployPrefilledModelModal;
