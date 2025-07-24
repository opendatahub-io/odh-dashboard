import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { ServingRuntimePlatform } from '@odh-dashboard/internal/types';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { getProjectModelServingPlatform } from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { isProjectNIMSupported } from '@odh-dashboard/internal/pages/modelServing/screens/projects/nimUtils';
import ManageServingRuntimeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/ServingRuntimeModal/ManageServingRuntimeModal';
import ManageKServeModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ManageNIMServingModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import useServingPlatformStatuses from '@odh-dashboard/internal/pages/modelServing/useServingPlatformStatuses';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

export const DeployButton: React.FC<{
  platform?: ModelServingPlatform;
  variant?: 'primary' | 'secondary';
  isDisabled?: boolean;
}> = ({ platform, variant = 'primary', isDisabled }) => {
  const [modalShown, setModalShown] = React.useState<boolean>(false);
  const [platformSelected, setPlatformSelected] = React.useState<
    ServingRuntimePlatform | undefined
  >(undefined);

  const servingPlatformStatuses = useServingPlatformStatuses();

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    servingRuntimeTemplates: [templates],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    connections: { data: connections },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );

  const { platform: currentProjectServingPlatform } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );

  const isKServeNIMEnabled = isProjectNIMSupported(currentProject);

  const onSubmit = (submit: boolean) => {
    setModalShown(false);
    setPlatformSelected(undefined);
    if (submit) {
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500);
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
      setPlatformSelected(currentProjectServingPlatform);
    }
    setModalShown(true);
  };

  const deployButton = (
    <Button
      variant={variant}
      data-testid="deploy-button"
      onClick={handleDeployClick}
      isAriaDisabled={isDisabled}
    >
      Deploy model
    </Button>
  );

  if (!platform && !currentProjectServingPlatform) {
    return <Tooltip content="To deploy a model, select a project.">{deployButton}</Tooltip>;
  }

  return (
    <>
      {deployButton}
      {modalShown && platformSelected === ServingRuntimePlatform.MULTI ? (
        <ManageServingRuntimeModal
          currentProject={currentProject}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
          )}
          onClose={onSubmit}
        />
      ) : null}
      {modalShown && platformSelected === ServingRuntimePlatform.SINGLE && isKServeNIMEnabled ? (
        <ManageNIMServingModal projectContext={{ currentProject }} onClose={onSubmit} />
      ) : null}
      {modalShown && platformSelected === ServingRuntimePlatform.SINGLE && !isKServeNIMEnabled ? (
        <ManageKServeModal
          projectContext={{ currentProject, connections }}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
          )}
          onClose={onSubmit}
        />
      ) : null}
    </>
  );
};
