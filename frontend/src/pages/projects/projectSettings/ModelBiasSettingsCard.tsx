import React from 'react';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ProjectKind } from '#~/k8sTypes';
import useTrustyCRState from '#~/concepts/trustyai/content/useTrustyCRState';

type ModelBiasSettingsCardProps = {
  project: ProjectKind;
};
const ModelBiasSettingsCard: React.FC<ModelBiasSettingsCardProps> = ({ project }) => {
  const { action, status } = useTrustyCRState(project);

  return (
    <Card style={{ maxWidth: '675px' }}>
      <CardHeader>
        <CardTitle>Model monitoring bias</CardTitle>
      </CardHeader>
      <CardBody>
        To ensure that machine-learning models are transparent, fair, and reliable, data scientists
        can use TrustyAI to monitor their data science models. TrustyAI is an open-source AI
        Explainability (XAI) Toolkit that offers comprehensive explanations of predictive models in
        both enterprise and data science applications.
      </CardBody>
      <CardFooter>
        <Stack hasGutter>
          <StackItem>{action}</StackItem>
          {status && <StackItem>{status}</StackItem>}
        </Stack>
      </CardFooter>
    </Card>
  );
};

export default ModelBiasSettingsCard;
