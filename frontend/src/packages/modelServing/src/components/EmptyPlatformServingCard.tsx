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

type EmptyPlatformServingCardProps = {
  resetButton: React.ReactNode;
  title: string;
  description: string;
};

const EmptyPlatformServingCard: React.FC<EmptyPlatformServingCardProps> = ({
  resetButton,
  title,
  description,
}) => (
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
        <Content component={ContentVariants.h2}>{title}</Content>
      </Content>
    </CardTitle>
    <CardBody>{description}</CardBody>
    <CardFooter>
      <Bullseye>{resetButton}</Bullseye>
    </CardFooter>
  </Card>
);

export default EmptyPlatformServingCard;
