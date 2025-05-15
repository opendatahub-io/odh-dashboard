import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, CardFooter, Flex } from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import ModelServingPlatformButtonAction from '~/pages/modelServing/screens/projects/ModelServingPlatformButtonAction';
import { ServingRuntimePlatform } from '~/types';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import ManageServingRuntimeModal from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ManageServingRuntimeModal';
import ManageKServeModal from '~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ManageNIMServingModal from '~/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import { modelVersionRoute } from '~/routes/modelRegistry/modelVersions';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';

type AddModelFooterProps = {
  selectedPlatform?: ServingRuntimePlatform;
  isNIM?: boolean;
};

const AddModelFooter: React.FC<AddModelFooterProps> = ({ selectedPlatform, isNIM }) => {
  const navigate = useNavigate();

  const [modalShown, setModalShown] = React.useState<boolean>(false);
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

  const [queryParams] = useSearchParams();
  const modelRegistryName = queryParams.get('modelRegistryName');
  const registeredModelId = queryParams.get('registeredModelId');
  const modelVersionId = queryParams.get('modelVersionId');
  // deployingFromRegistry = User came from the Model Registry page because this project didn't have a serving platform selected
  const deployingFromRegistry = modelRegistryName && registeredModelId && modelVersionId;

  return (
    <CardFooter>
      <Flex gap={{ default: 'gapMd' }}>
        <ModelServingPlatformButtonAction
          isProjectModelMesh={isProjectModelMesh}
          emptyTemplates={emptyTemplates}
          onClick={() => setModalShown(true)}
          variant="link"
          isInline
          testId="model-serving-platform-button"
        />
        {deployingFromRegistry &&
          !isProjectModelMesh && ( // For modelmesh we don't want to offer this until there is a model server
            <Button
              variant="link"
              isInline
              onClick={() => {
                navigate(modelVersionRoute(modelVersionId, registeredModelId, modelRegistryName));
              }}
              data-testid="deploy-from-registry"
            >
              Deploy model from model registry
            </Button>
          )}
      </Flex>
      {modalShown && isProjectModelMesh && !isNIM ? (
        <ManageServingRuntimeModal
          currentProject={currentProject}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
          )}
          onClose={onSubmit}
        />
      ) : null}
      {modalShown && !isProjectModelMesh && !isNIM ? (
        <ManageKServeModal
          projectContext={{ currentProject, connections }}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
          )}
          onClose={onSubmit}
        />
      ) : null}
      {modalShown && isNIM ? (
        <ManageNIMServingModal projectContext={{ currentProject }} onClose={onSubmit} />
      ) : null}
    </CardFooter>
  );
};

export default AddModelFooter;
