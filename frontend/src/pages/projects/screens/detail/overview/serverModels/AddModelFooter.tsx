import * as React from 'react';
import { CardFooter, Flex } from '@patternfly/react-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import ModelServingPlatformButtonAction from '#~/pages/modelServing/screens/projects/ModelServingPlatformButtonAction';
import { ServingRuntimePlatform } from '#~/types';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import ManageKServeModal from '#~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import ManageNIMServingModal from '#~/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import { NavigateBackToRegistryButton } from '#~/concepts/modelServing/NavigateBackToRegistryButton.tsx';

type AddModelFooterProps = {
  isNIM?: boolean;
};

const AddModelFooter: React.FC<AddModelFooterProps> = ({ isNIM }) => {
  const [modalShown, setModalShown] = React.useState<boolean>(false);

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
      <Flex gap={{ default: 'gapMd' }}>
        <ModelServingPlatformButtonAction
          emptyTemplates={emptyTemplates}
          onClick={() => setModalShown(true)}
          variant="link"
          isInline
          testId="model-serving-platform-button"
        />
        <NavigateBackToRegistryButton />
      </Flex>
      {modalShown && !isNIM ? (
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
