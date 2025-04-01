import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { SelectServingCard } from '~/concepts/modelServing/platforms/types';

const EmptyMultiModelServingCard: SelectServingCard = ({ resetButton }) => (
  <Card
    style={{
      height: '100%',
      border: '1px solid var(--pf-t--global--border--color--default)',
      borderRadius: 16,
    }}
    data-testid="multi-serving-platform-card"
  >
    <CardTitle>
      <Content>
        <Content component={ContentVariants.h2}>Multi-model serving platform</Content>
      </Content>
    </CardTitle>
    <CardBody>
      Multiple models can be deployed on one shared model server. Choose this option when you want
      to deploy a number of small or medium-sized models that can share the server resources.
    </CardBody>
    <CardFooter>
      <Bullseye>{resetButton}</Bullseye>
    </CardFooter>
  </Card>
);

export default EmptyMultiModelServingCard;
