import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import ManageInferenceServiceModal from '#~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { ModelServingContext } from '#~/pages/modelServing/ModelServingContext';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimePlatform } from '#~/types';
import { getProjectModelServingPlatform } from '#~/pages/modelServing/screens/projects/utils';
import ManageKServeModal from '#~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import ManageNIMServingModal from '#~/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { useKueueConfiguration } from '#~/kueueUtils';
import { KUEUE_MODEL_DEPLOYMENT_DISABLED_MESSAGE } from '#~/kueueConstants';

const ServeModelButton: React.FC = () => {
  const [platformSelected, setPlatformSelected] = React.useState<
    ServingRuntimePlatform | undefined
  >(undefined);
  const {
    inferenceServices: { refresh: refreshInferenceServices },
    servingRuntimes: { refresh: refreshServingRuntimes },
    servingRuntimeTemplates: [templates],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    connections: { data: connections },
  } = React.useContext(ModelServingContext);
  const { projects } = React.useContext(ProjectsContext);
  const { namespace } = useParams<{ namespace: string }>();
  const servingPlatformStatuses = useServingPlatformStatuses();
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;

  const project = projects.find(byName(namespace));

  const { isKueueDisabled } = useKueueConfiguration(project);

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );
  const isKServeNIMEnabled = !!project && isProjectNIMSupported(project);

  const isProjectModelMesh =
    project &&
    getProjectModelServingPlatform(project, servingPlatformStatuses).platform ===
      ServingRuntimePlatform.MULTI;

  const onSubmit = (submit: boolean) => {
    if (submit) {
      refreshInferenceServices();
      refreshServingRuntimes();
    }
    setPlatformSelected(undefined);
  };

  const deployButton = (
    <Button
      data-testid="deploy-button"
      variant="primary"
      onClick={() =>
        project &&
        setPlatformSelected(
          getProjectModelServingPlatform(project, servingPlatformStatuses).platform,
        )
      }
      isAriaDisabled={
        !project ||
        templatesEnabled.length === 0 ||
        (!isNIMAvailable && isKServeNIMEnabled) ||
        (!isProjectModelMesh && isKueueDisabled)
      }
    >
      Deploy model
    </Button>
  );

  if (!project) {
    return (
      <Tooltip data-testid="deploy-model-tooltip" content="To deploy a model, select a project.">
        {deployButton}
      </Tooltip>
    );
  }

  if (!isNIMAvailable && isKServeNIMEnabled) {
    return (
      <Tooltip content="NIM is not available. Contact your administrator.">{deployButton}</Tooltip>
    );
  }

  if (!isProjectModelMesh && isKueueDisabled) {
    return <Tooltip content={KUEUE_MODEL_DEPLOYMENT_DISABLED_MESSAGE}>{deployButton}</Tooltip>;
  }

  return (
    <>
      {deployButton}
      {platformSelected === ServingRuntimePlatform.MULTI ? (
        <ManageInferenceServiceModal
          projectContext={{
            currentProject: project,
            connections,
          }}
          onClose={(submit: boolean) => {
            onSubmit(submit);
          }}
        />
      ) : null}
      {platformSelected === ServingRuntimePlatform.SINGLE ? (
        isKServeNIMEnabled ? (
          <ManageNIMServingModal projectContext={{ currentProject: project }} onClose={onSubmit} />
        ) : (
          <ManageKServeModal
            projectContext={{
              currentProject: project,
              connections,
            }}
            servingRuntimeTemplates={templatesEnabled.filter((template) =>
              getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
            )}
            onClose={(submit: boolean) => {
              onSubmit(submit);
            }}
          />
        )
      ) : null}
    </>
  );
};

export default ServeModelButton;
