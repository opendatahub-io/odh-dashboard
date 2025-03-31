import React from 'react';
import { Alert, Button, Form, FormSection, Spinner } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated'; // TODO migrate to non-deprecated modal
import { CatalogModel } from '~/concepts/modelCatalog/types';
import { ProjectKind } from '~/k8sTypes';
import useProjectErrorForRegisteredModel from '~/pages/modelRegistry/screens/RegisteredModels/useProjectErrorForRegisteredModel';
import ProjectSelector from '~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSelector';
import ManageKServeModal from '~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '~/types';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { getKServeTemplates } from '~/pages/modelServing/customServingRuntimes/utils';
import useConnections from '~/pages/projects/screens/detail/connections/useConnections';
import { isRedHatRegistryUri } from '~/pages/modelRegistry/screens/utils';
import ModelServingContextProvider, {
  ModelServingContext,
} from '~/pages/modelServing/ModelServingContext';
import { ModelDeployPrefillInfo } from '~/pages/modelServing/screens/projects/usePrefillModelDeployModal';

interface DeployCatalogModelModalProps {
  model: CatalogModel;
  onCancel: () => void;
  onSubmit?: () => void;
}

// TODO abstract away common logic here into a DeployPrefilledModelModal under serving
// TODO what else can we do to clean these up after the abstraction?

const DeployCatalogModelModalContents: React.FC<
  DeployCatalogModelModalProps & {
    selectedProject: ProjectKind | null;
    setSelectedProject: (project: ProjectKind | null) => void;
  }
> = ({ model, onCancel, onSubmit, selectedProject, setSelectedProject }) => {
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
  const [connections] = useConnections(selectedProject?.metadata.name, true);

  const modelDeployPrefillInfo: ModelDeployPrefillInfo = {
    modelName: model.name,
    modelArtifactUri: model.artifacts?.[0].uri,
    connectionTypeName: 'oci-v1', // TODO maybe get this based on the URI like in useRegisteredModelDeployPrefillInfo? Also maybe it should be from an enum?
  };

  const isOciModel = modelDeployPrefillInfo.modelArtifactUri?.includes('oci://');
  const platformToUse = platform || (isOciModel ? ServingRuntimePlatform.SINGLE : undefined);
  const { loaded: projectDeployStatusLoaded, error: projectError } =
    useProjectErrorForRegisteredModel(selectedProject?.metadata.name, platformToUse);

  const error = platformError || projectError;

  const handleSubmit = React.useCallback(async () => {
    onSubmit?.();
  }, [onSubmit]);

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
        {!servingContextLoaded ? (
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
      <Modal
        title="Deploy model"
        description="Configure properties for deploying your model"
        variant="medium"
        isOpen
        onClose={() => onClose(false)}
        actions={[
          // The Deploy button is disabled as this particular return of the Modal
          // only happens when there's not a valid selected project, otherwise we'll
          // render the ManageKServeModal or ManageInferenceServiceModal
          <Button key="deploy" variant="primary" isDisabled>
            Deploy
          </Button>,
          <Button key="cancel" variant="link" onClick={() => onClose(false)}>
            Cancel
          </Button>,
        ]}
        showClose
      >
        {modalForm}
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

const DeployCatalogModelModal: React.FC<DeployCatalogModelModalProps> = (props) => {
  const [selectedProject, setSelectedProject] = React.useState<ProjectKind | null>(null);
  return (
    <ModelServingContextProvider namespace={selectedProject?.metadata.name}>
      <DeployCatalogModelModalContents
        {...props}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
      />
    </ModelServingContextProvider>
  );
};

export default DeployCatalogModelModal;
