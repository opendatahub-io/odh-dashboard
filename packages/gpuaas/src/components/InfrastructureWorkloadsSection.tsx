import * as React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';

const InfrastructureWorkloadsSection: React.FC = () => (
  <Stack hasGutter data-testid="infrastructure-workloads">
    <StackItem>
      <Title headingLevel="h2" data-testid="infrastructure-workloads-title">
        Workloads
      </Title>
    </StackItem>
  </Stack>
);

export default InfrastructureWorkloadsSection;
