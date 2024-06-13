import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimePlatform } from '~/types';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import ModelServingPlatformButtonAction from '~/pages/modelServing/screens/projects/ModelServingPlatformButtonAction';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';

const EmptyMultiModelServingCard: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    servingRuntimeTemplates: [templates],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
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
    if (submit) {
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
    }
  };

  return (
    <>
      <Card
        style={{
          height: '100%',
          border: '1px solid var(--pf-v5-global--BorderColor--100)',
          borderRadius: 16,
        }}
        data-testid="multi-serving-platform-card"
      >
        <CardTitle>
          <TextContent>
            <Text component={TextVariants.h2}>Multi-model serving platform</Text>
          </TextContent>
        </CardTitle>
        <CardBody>
          Multiple models can be deployed on one shared model server. Choose this option when you
          want to deploy a number of small or medium-sized models that can share the server
          resources.
        </CardBody>
        <CardFooter>
          <Bullseye>
            <ModelServingPlatformButtonAction
              isProjectModelMesh
              emptyTemplates={emptyTemplates}
              onClick={() => setOpen(true)}
              variant="secondary"
              testId="multi-serving-add-server-button"
            />
          </Bullseye>
        </CardFooter>
      </Card>
      <ManageServingRuntimeModal
        isOpen={open}
        currentProject={currentProject}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
        )}
        onClose={(submit: boolean) => {
          setOpen(false);
          onSubmit(submit);
        }}
      />
    </>
  );
};

export default EmptyMultiModelServingCard;
