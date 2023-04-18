import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const EmptyCustomServingRuntime: React.FC = () => (
  <EmptyState>
    <EmptyStateIcon icon={CubesIcon} />
    <Title headingLevel="h2" size="lg">
      No custom serving runtimes.
    </Title>
    <EmptyStateBody>To get started, create a new serving runtime.</EmptyStateBody>
    {/* // TODO: Add button to create new custom serving runtime */}
  </EmptyState>
);

export default EmptyCustomServingRuntime;
