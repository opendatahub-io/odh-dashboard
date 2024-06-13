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
import ManageKServeModal from './kServeModal/ManageKServeModal';

const EmptySingleModelServingCard: React.FC = () => {
  const {
    dataConnections: { data: dataConnections },
  } = React.useContext(ProjectDetailsContext);
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

  const onSubmit = (submit: boolean) => {
    if (submit) {
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
    }
  };

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );
  const emptyTemplates = templatesEnabled.length === 0;

  return (
    <>
      <Card
        style={{
          height: '100%',
          border: '1px solid var(--pf-v5-global--BorderColor--100)',
          borderRadius: 16,
        }}
        data-testid="single-serving-platform-card"
      >
        <CardTitle>
          <TextContent>
            <Text component={TextVariants.h2}>Single-model serving platform</Text>
          </TextContent>
        </CardTitle>
        <CardBody>
          Each model is deployed on its own model server. Choose this option when you want to deploy
          a large model such as a large language model (LLM).
        </CardBody>
        <CardFooter>
          <Bullseye>
            <ModelServingPlatformButtonAction
              isProjectModelMesh={false}
              emptyTemplates={emptyTemplates}
              onClick={() => setOpen(true)}
              variant="secondary"
              testId="single-serving-deploy-button"
            />
          </Bullseye>
        </CardFooter>
      </Card>
      <ManageKServeModal
        isOpen={open}
        projectContext={{
          currentProject,
          dataConnections,
        }}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
        )}
        onClose={(submit) => {
          onSubmit(submit);
          setOpen(false);
        }}
      />
    </>
  );
};

export default EmptySingleModelServingCard;
