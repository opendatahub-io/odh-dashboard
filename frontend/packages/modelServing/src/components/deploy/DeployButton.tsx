import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip, type ButtonProps } from '@patternfly/react-core';
import { ServingRuntimePlatform } from '@odh-dashboard/internal/types';
import { getTemplateEnabledForPlatform } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import ManageServingRuntimeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/ServingRuntimeModal/ManageServingRuntimeModal';
import ManageKServeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ManageNIMServingModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import useConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useConnections';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { isProjectNIMSupported } from '@odh-dashboard/internal/pages/modelServing/screens/projects/nimUtils';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/index';
import { useServingRuntimeTemplates } from '../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';

const DeployButtonModal: React.FC<{
  platform?: ServingRuntimePlatform;
  currentProject: ProjectKind;
  onClose: (submit: boolean) => void;
}> = ({ platform, currentProject, onClose }) => {
  const [templates] = useServingRuntimeTemplates();
  const connections = useConnections(currentProject.metadata.name);

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
  project: ProjectKind | null;
  variant?: ButtonProps['variant'];
  createRoute?: string;
}> = ({ project, variant = 'primary', createRoute }) => {
  const navigate = useNavigate();

  const [modalShown, setModalShown] = React.useState<boolean>(false);

  const { clusterPlatforms } = useAvailableClusterPlatforms();
  const { activePlatform } = useProjectServingPlatform(project ?? undefined, clusterPlatforms);
  const deploymentWizardAvailable = useIsAreaAvailable(SupportedArea.DEPLOYMENT_WIZARD).status;

  // TODO: remove once we have the wizard
  const legacyServingRuntimePlatform = React.useMemo(
    () =>
      activePlatform?.properties.id === 'modelmesh'
        ? ServingRuntimePlatform.MULTI
        : ServingRuntimePlatform.SINGLE,
    [activePlatform],
  );

  const onSubmit = () => {
    setModalShown(false);
  };

  const handleDeployClick = () => {
    if (deploymentWizardAvailable && createRoute) {
      navigate(createRoute);
    } else {
      // Use legacy modal
      setModalShown(true);
    }
  };

  const [globalTemplates, globalTemplatesLoaded] = useServingRuntimeTemplates();
  const isMissingTemplates = globalTemplates.length === 0 && globalTemplatesLoaded;

  const disableButton = !project || isMissingTemplates;
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
        content={disabledReason}
      >
        {deployButton}
      </Tooltip>
    );
  }

  return (
    <>
      {deployButton}
      {modalShown && !deploymentWizardAvailable ? (
        <DeployButtonModal
          platform={legacyServingRuntimePlatform}
          currentProject={project}
          onClose={onSubmit}
        />
      ) : null}
    </>
  );
};
