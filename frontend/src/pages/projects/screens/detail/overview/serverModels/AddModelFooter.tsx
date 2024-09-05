import * as React from 'react';
import { CardFooter } from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import ModelServingPlatformButtonAction from '~/pages/modelServing/screens/projects/ModelServingPlatformButtonAction';
import { ServingRuntimePlatform } from '~/types';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import ManageServingRuntimeModal from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ManageServingRuntimeModal';
import ManageKServeModal from '~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import DeployNIMServiceModal from '~/pages/modelServing/screens/projects/NIMServiceModal/DeployNIMServiceModal';

type AddModelFooterProps = {
  selectedPlatform?: ServingRuntimePlatform;
  isNIM?: boolean;
};

const AddModelFooter: React.FC<AddModelFooterProps> = ({ selectedPlatform, isNIM }) => {
  const [modalShown, setModalShown] = React.useState<boolean>(false);

  const servingPlatformStatuses = useServingPlatformStatuses();

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    servingRuntimeTemplates: [templates],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    dataConnections: { data: dataConnections },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );

  const emptyTemplates = templatesEnabled.length === 0;

  const { platform: currentProjectServingPlatform } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );

  const isProjectModelMesh =
    (selectedPlatform || currentProjectServingPlatform) === ServingRuntimePlatform.MULTI;

  const onSubmit = (submit: boolean) => {
    setModalShown(false);
    if (submit) {
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
    }
  };

  return (
    <CardFooter>
      <ModelServingPlatformButtonAction
        isProjectModelMesh={isProjectModelMesh}
        emptyTemplates={emptyTemplates}
        onClick={() => setModalShown(true)}
        variant="link"
        isInline
        testId="model-serving-platform-button"
      />
      {modalShown && isProjectModelMesh && !isNIM ? (
        <ManageServingRuntimeModal
          isOpen
          currentProject={currentProject}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
          )}
          onClose={onSubmit}
        />
      ) : null}
      {modalShown && !isProjectModelMesh && !isNIM ? (
        <ManageKServeModal
          isOpen
          projectContext={{ currentProject, dataConnections }}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
          )}
          onClose={onSubmit}
        />
      ) : null}
      {modalShown && isNIM ? (
        <DeployNIMServiceModal
          isOpen
          projectContext={{ currentProject, dataConnections }}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
          )}
          onClose={onSubmit}
        />
      ) : null}
    </CardFooter>
  );
};

export default AddModelFooter;
