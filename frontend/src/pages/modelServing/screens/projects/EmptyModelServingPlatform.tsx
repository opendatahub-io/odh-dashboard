import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';

const EmptyModelServingPlatform: React.FC = () => (
  <EmptyState variant="xs">
    <EmptyStateIcon icon={WrenchIcon} />
    <Title headingLevel="h3" size="lg">
      No model serving platform selected
    </Title>
    <EmptyStateBody>
      To enable model serving, an administrator must first select a model serving platform in the
      cluster settings.
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyModelServingPlatform;
