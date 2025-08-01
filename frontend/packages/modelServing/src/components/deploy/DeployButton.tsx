import React from 'react';
import { Button, Tooltip, type ButtonProps } from '@patternfly/react-core';
import { ServingRuntimePlatform } from '@odh-dashboard/internal/types';
import { getTemplateEnabledForPlatform } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import ManageServingRuntimeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/ServingRuntimeModal/ManageServingRuntimeModal';
import ManageKServeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ManageNIMServingModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useParams } from 'react-router-dom';
import useConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useConnections';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { isProjectNIMSupported } from '@odh-dashboard/internal/pages/modelServing/screens/projects/nimUtils';
import { useServingRuntimeTemplates } from '../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import {
  useProjectServingPlatform,
  ModelServingPlatform,
} from '../../concepts/useProjectServingPlatform';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';

const DeployButtonModal: React.FC<{
  platform: ServingRuntimePlatform;
  currentProject: ProjectKind;
  namespace?: string;
  onClose: (submit: boolean) => void;
}> = ({ platform, currentProject, namespace, onClose }) => {
  const [templates] = useServingRuntimeTemplates();
  const connections = useConnections(namespace || '');

  if (platform === ServingRuntimePlatform.MULTI) {
    return (
      <ManageServingRuntimeModal
        currentProject={currentProject}
        servingRuntimeTemplates={templates.filter((t) =>
          getTemplateEnabledForPlatform(t, ServingRuntimePlatform.MULTI),
        )}
        onClose={onClose}
      />
    );
  }

  const isNIMSupported = isProjectNIMSupported(currentProject);
  if (isNIMSupported) {
    return <ManageNIMServingModal projectContext={{ currentProject }} onClose={onClose} />;
  }
  return (
    <ManageKServeModal
      projectContext={{ currentProject, connections: connections.data }}
      servingRuntimeTemplates={templates.filter((t) =>
        getTemplateEnabledForPlatform(t, ServingRuntimePlatform.SINGLE),
      )}
      onClose={onClose}
    />
  );
};

export const DeployButton: React.FC<{
  platform?: ModelServingPlatform;
  variant?: ButtonProps['variant'];
  isDisabled?: boolean;
}> = ({ platform, variant = 'primary', isDisabled }) => {
  const [modalShown, setModalShown] = React.useState<boolean>(false);
  const [platformSelected, setPlatformSelected] = React.useState<ServingRuntimePlatform>();
  const { namespace: modelNamespace } = useParams<{ namespace: string }>();
  const { projects } = React.useContext(ProjectsContext);
  const { clusterPlatforms } = useAvailableClusterPlatforms();
  const { projects: modelProjects } = React.useContext(ModelDeploymentsContext);
  const match = modelNamespace ? projects.find(byName(modelNamespace)) : undefined;
  const currentProject = modelProjects?.find(byName(modelNamespace));
  const { activePlatform, projectPlatform } = useProjectServingPlatform(match, clusterPlatforms);

  const getServingRuntimePlatform = (platformId: string): ServingRuntimePlatform =>
    platformId === 'modelmesh' ? ServingRuntimePlatform.MULTI : ServingRuntimePlatform.SINGLE;

  const onSubmit = () => {
    setModalShown(false);
    setPlatformSelected(undefined);
  };

  const handleDeployClick = () => {
    if (platform) {
      setPlatformSelected(getServingRuntimePlatform(platform.properties.id));
    } else {
      const currentPlatform = activePlatform || projectPlatform;
      if (currentProject && currentPlatform) {
        setPlatformSelected(getServingRuntimePlatform(currentPlatform.properties.id));
      }
    }
    setModalShown(true);
  };

  const [templates, templatesLoaded] = useServingRuntimeTemplates();
  const isMissingTemplates = templates.length === 0 || !templatesLoaded;

  const disableButton = !platform || !currentProject || isDisabled || isMissingTemplates;
  const disabledReason = isMissingTemplates
    ? 'At least one serving runtime must be enabled to deploy a model. Contact your administrator.'
    : 'To deploy a model, select a project.';

  const deployButton = (
    <Button
      data-testid="deploy-button"
      variant={variant}
      onClick={handleDeployClick}
      isAriaDisabled={disableButton}
      isInline={variant === 'link'}
    >
      Deploy model
    </Button>
  );

  if (disableButton) {
    return (
      <Tooltip
        data-testid="deploy-model-tooltip"
        aria-label="Model Serving Action Info"
        content={<div>{disabledReason}</div>}
      >
        {deployButton}
      </Tooltip>
    );
  }

  return (
    <>
      {deployButton}
      {modalShown && platformSelected ? (
        <DeployButtonModal
          platform={platformSelected}
          currentProject={currentProject}
          namespace={modelNamespace}
          onClose={onSubmit}
        />
      ) : null}
    </>
  );
};
