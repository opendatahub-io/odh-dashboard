import React from 'react';
import { Alert, Button, Form, FormSection, Modal, Spinner } from '@patternfly/react-core';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import { ProjectKind } from '~/k8sTypes';
import useProjectErrorForRegisteredModel from '~/pages/modelRegistry/screens/RegisteredModels/useProjectErrorForRegisteredModel';
import ProjectSelector from '~/pages/modelServing/screens/projects/InferenceServiceModal/ProjectSelector';
import ManageKServeModal from '~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '~/types';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import useRegisteredModelDeployInfo from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployInfo';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { getKServeTemplates } from '~/pages/modelServing/customServingRuntimes/utils';
import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';

interface DeployRegisteredModelModalProps {
  modelVersion: ModelVersion;
  onCancel: () => void;
  onSubmit?: () => void;
}

const DeployRegisteredModelModal: React.FC<DeployRegisteredModelModalProps> = ({
  modelVersion,
  onCancel,
  onSubmit,
}) => {
  const {
    servingRuntimeTemplates: [templates],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
  } = React.useContext(ModelRegistryContext);

  const [selectedProject, setSelectedProject] = React.useState<ProjectKind | null>(null);
  const servingPlatformStatuses = useServingPlatformStatuses();
  const { platform, error: platformError } = getProjectModelServingPlatform(
    selectedProject,
    servingPlatformStatuses,
  );
  const { loaded: projectDeployStatusLoaded, error: projectError } =
    useProjectErrorForRegisteredModel(selectedProject?.metadata.name, platform);
  const [dataConnections] = useDataConnections(selectedProject?.metadata.name);
  const error = platformError || projectError;

  const {
    registeredModelDeployInfo,
    loaded: deployInfoLoaded,
    error: deployInfoError,
  } = useRegisteredModelDeployInfo(modelVersion);

  const onClose = React.useCallback(
    (submit: boolean) => {
      if (submit) {
        onSubmit?.();
      }

      setSelectedProject(null);
      onCancel();
    },
    [onCancel, onSubmit],
  );

  const projectSection = (
    <ProjectSelector
      selectedProject={selectedProject}
      setSelectedProject={setSelectedProject}
      error={error}
    />
  );

  if (
    (platform === ServingRuntimePlatform.MULTI && !projectDeployStatusLoaded) ||
    !selectedProject ||
    !platform
  ) {
    const modalForm = (
      <Form>
        {deployInfoError ? (
          <Alert variant="danger" isInline title={deployInfoError.name}>
            {deployInfoError.message}
          </Alert>
        ) : !deployInfoLoaded ? (
          <Spinner />
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

  if (platform === ServingRuntimePlatform.SINGLE) {
    return (
      <ManageKServeModal
        onClose={onClose}
        servingRuntimeTemplates={getKServeTemplates(templates, templateOrder, templateDisablement)}
        shouldFormHidden={!!error}
        registeredModelDeployInfo={registeredModelDeployInfo}
        projectContext={{ currentProject: selectedProject, dataConnections }}
        projectSection={projectSection}
      />
    );
  }
  // platform === ServingRuntimePlatform.MULTI
  return (
    <ManageInferenceServiceModal
      onClose={onClose}
      shouldFormHidden={!!error}
      registeredModelDeployInfo={registeredModelDeployInfo}
      projectContext={{ currentProject: selectedProject, dataConnections }}
      projectSection={projectSection}
    />
  );
};

export default DeployRegisteredModelModal;
