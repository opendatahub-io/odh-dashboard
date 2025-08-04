import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { ServingRuntimePlatform } from '@odh-dashboard/internal/types';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import ManageServingRuntimeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/ServingRuntimeModal/ManageServingRuntimeModal';
import ManageKServeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ManageNIMServingModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useParams } from 'react-router-dom';
import { useTemplates } from '@odh-dashboard/internal/api/k8s/templates';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/index';
import useTemplateOrder from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/useTemplateDisablement';
import useConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useConnections';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { isProjectNIMSupported } from '@odh-dashboard/internal/pages/modelServing/screens/projects/nimUtils';
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
  const { dashboardNamespace } = useDashboardNamespace();
  const [servingRuntimeTemplates] = useTemplates(dashboardNamespace);
  const servingRuntimeTemplateOrder = useTemplateOrder(dashboardNamespace, undefined);
  const servingRuntimeTemplateDisablement = useTemplateDisablement(dashboardNamespace, undefined);
  const connections = useConnections(namespace || '');
  const templatesSorted = getSortedTemplates(
    servingRuntimeTemplates,
    servingRuntimeTemplateOrder.data,
  );
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, servingRuntimeTemplateDisablement.data),
  );

  if (platform === ServingRuntimePlatform.MULTI) {
    return (
      <ManageServingRuntimeModal
        currentProject={currentProject}
        servingRuntimeTemplates={templatesEnabled.filter((t) =>
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
      servingRuntimeTemplates={templatesEnabled.filter((t) =>
        getTemplateEnabledForPlatform(t, ServingRuntimePlatform.SINGLE),
      )}
      onClose={onClose}
    />
  );
};

export const DeployButton: React.FC<{
  platform?: ModelServingPlatform;
  variant?: 'primary' | 'secondary';
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

  const deployButton = (
    <Button
      variant={variant}
      data-testid="deploy-button"
      onClick={handleDeployClick}
      isAriaDisabled={!currentProject}
    >
      Deploy model
    </Button>
  );

  if (!currentProject || isDisabled) {
    return (
      <Tooltip data-testid="deploy-model-tooltip" content="To deploy a model, select a project.">
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
