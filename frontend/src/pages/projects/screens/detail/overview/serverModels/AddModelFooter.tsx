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

const AddModelFooter: React.FC = () => {
  const [platformSelected, setPlatformSelected] = React.useState<
    ServingRuntimePlatform | undefined
  >(undefined);

  const servingPlatformStatuses = useServingPlatformStatuses();

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    servingRuntimeTemplates: { data: templates },
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

  const isProjectModelMesh = currentProjectServingPlatform === ServingRuntimePlatform.MULTI;

  const onSubmit = (submit: boolean) => {
    setPlatformSelected(undefined);
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
        onClick={() => {
          setPlatformSelected(
            isProjectModelMesh ? ServingRuntimePlatform.MULTI : ServingRuntimePlatform.SINGLE,
          );
        }}
        variant="link"
        isInline
        testId="model-serving-platform-button"
      />
      <ManageServingRuntimeModal
        isOpen={platformSelected === ServingRuntimePlatform.MULTI}
        currentProject={currentProject}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
        )}
        onClose={(submit: boolean) => {
          onSubmit(submit);
        }}
      />
      <ManageKServeModal
        isOpen={platformSelected === ServingRuntimePlatform.SINGLE}
        projectContext={{
          currentProject,
          dataConnections,
        }}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
        )}
        onClose={(submit: boolean) => {
          onSubmit(submit);
        }}
      />
    </CardFooter>
  );
};

export default AddModelFooter;
