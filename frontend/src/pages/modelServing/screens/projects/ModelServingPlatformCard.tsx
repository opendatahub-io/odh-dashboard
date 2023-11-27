import * as React from 'react';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Icon } from '@patternfly/react-core';
import { CogsIcon } from '@patternfly/react-icons';

type ModelServingPlatformCardProps = {
  id: string;
  title: string;
  description: string;
  action: React.ReactNode;
};

const ModelServingPlatformCard: React.FC<ModelServingPlatformCardProps> = ({
  id,
  title,
  description,
  action,
}) => (
  <Card id={id} isFullHeight isFlat>
    <CardHeader>
      <Icon size="xl">
        <CogsIcon />
      </Icon>
    </CardHeader>
    <CardTitle>{title}</CardTitle>
    <CardBody>{description}</CardBody>
    <CardFooter>{action}</CardFooter>
  </Card>
);

export default ModelServingPlatformCard;
