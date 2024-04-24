import * as React from 'react';
import { Card, CardBody, CardFooter, CardTitle, Stack, StackItem } from '@patternfly/react-core';

type SettingSectionProps = {
  children: React.ReactNode;
  title: string;
  testId?: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
};

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  children,
  footer,
  testId,
  description,
}) => (
  <Card data-testid={testId} isFlat>
    <CardTitle>{title}</CardTitle>
    <CardBody>
      <Stack hasGutter>
        {description && <StackItem>{description}</StackItem>}
        <StackItem>{children}</StackItem>
      </Stack>
    </CardBody>
    {footer && <CardFooter>{footer}</CardFooter>}
  </Card>
);

export default SettingSection;
