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
import { POLL_INTERVAL } from '@odh-dashboard/internal/utilities/const';
import useInferenceServices from '@odh-dashboard/internal/pages/modelServing/useInferenceServices';
import useServingRuntimes from '@odh-dashboard/internal/pages/modelServing/useServingRuntimes';
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
  onClose: (submit: boolean) => void;
}> = ({ platform, currentProject, onClose }) => {
  const { namespace } = useParams();
  const { dashboardNamespace } = useDashboardNamespace();
  const [servingRuntimeTemplates] = useTemplates(dashboardNamespace);
  const servingRuntimeTemplateOrder = useTemplateOrder(dashboardNamespace, undefined);
  const servingRuntimeTemplateDisablement = useTemplateDisablement(dashboardNamespace, undefined);
  const connections = useConnections(namespace);
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
  const { namespace } = useParams();
  const { projects } = React.useContext(ProjectsContext);
  const match = namespace ? projects.find(byName(namespace)) : undefined;
  const { clusterPlatforms } = useAvailableClusterPlatforms();
  const { activePlatform, projectPlatform } = useProjectServingPlatform(match, clusterPlatforms);
  const inferenceServices = useInferenceServices(namespace, undefined, undefined, undefined, {
    refreshRate: POLL_INTERVAL,
  });
  const inferenceServiceRefresh = inferenceServices.refresh;
  const servingRuntimes = useServingRuntimes(namespace, undefined, { refreshRate: POLL_INTERVAL });
  const servingRuntimeRefresh = servingRuntimes.refresh;
  const { projects: modelProjects } = React.useContext(ModelDeploymentsContext);
  const { namespace: modelNamespace } = useParams<{ namespace: string }>();
  const currentProject = modelProjects?.find(byName(modelNamespace));

  const onSubmit = (submit: boolean) => {
    setModalShown(false);
    setPlatformSelected(undefined);
    if (submit) {
      servingRuntimeRefresh();
      inferenceServiceRefresh();
    }
  };

  const handleDeployClick = () => {
    if (platform) {
      setPlatformSelected(
        platform.properties.id === 'modelmesh'
          ? ServingRuntimePlatform.MULTI
          : ServingRuntimePlatform.SINGLE,
      );
    } else {
      const currentPlatform = activePlatform || projectPlatform;
      if (currentProject && currentPlatform) {
        setPlatformSelected(
          currentPlatform.properties.id === 'modelmesh'
            ? ServingRuntimePlatform.MULTI
            : ServingRuntimePlatform.SINGLE,
        );
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
          onClose={onSubmit}
        />
      ) : null}
    </>
  );
};
