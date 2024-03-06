import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Flex,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimePlatform } from '~/types';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import ManageKServeModal from './kServeModal/ManageKServeModal';

type EmptySingleModelServingCardProps = {
  allowCreate: boolean;
};

const EmptySingleModelServingCard: React.FC<EmptySingleModelServingCardProps> = ({
  allowCreate,
}) => {
  const {
    dataConnections: { data: dataConnections },
  } = React.useContext(ProjectDetailsContext);
  const [open, setOpen] = React.useState(false);

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    servingRuntimeTemplates: { data: templates },
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const { refresh: refreshAllProjects } = React.useContext(ProjectsContext);

  const onSubmit = (submit: boolean) => {
    if (submit) {
      refreshAllProjects();
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
    }
  };

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );

  return (
    <>
      <Card
        style={{ height: '100%', border: '1.5px dashed var(--pf-v5-global--BorderColor--200)' }}
      >
        <CardTitle>
          <TextContent>
            <Text component={TextVariants.h2}>Single model serving platform</Text>
          </TextContent>
        </CardTitle>
        <CardBody>
          Each model is deployed from its own model server. Choose this option when you have a small
          number of large models to deploy.
        </CardBody>
        <CardFooter>
          {allowCreate ? (
            <Flex style={{ width: '100%' }} justifyContent={{ default: 'justifyContentCenter' }}>
              <Button onClick={() => setOpen(true)} variant="secondary">
                Add model server
              </Button>
            </Flex>
          ) : null}
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
        onClose={(submit: boolean) => {
          onSubmit(submit);
          setOpen(false);
        }}
      />
    </>
  );
};

export default EmptySingleModelServingCard;
