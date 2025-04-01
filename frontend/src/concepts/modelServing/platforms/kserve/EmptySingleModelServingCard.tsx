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

const EmptySingleModelServingCard: SelectServingCard = ({ resetButton }) => (
  <Card
    style={{
      height: '100%',
      border: '1px solid var(--pf-t--global--border--color--default)',
      borderRadius: 16,
    }}
    data-testid="single-serving-platform-card"
  >
    <CardTitle>
      <Content component={ContentVariants.h2}>Single-model serving platform</Content>
    </CardTitle>
    <CardBody>
      Each model is deployed on its own model server. Choose this option when you want to deploy a
      large model such as a large language model (LLM).
    </CardBody>
    <CardFooter>
      <Bullseye>{resetButton}</Bullseye>
    </CardFooter>
  </Card>
);

export default EmptySingleModelServingCard;
