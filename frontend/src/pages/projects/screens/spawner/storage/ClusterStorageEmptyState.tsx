import React from 'react';
import { EmptyState, EmptyStateVariant, Title, EmptyStateBody } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

export const ClusterStorageEmptyState: React.FC = () => (
  <EmptyState
    titleText={
      <Title headingLevel="h2" size="lg">
        No cluster storage
      </Title>
    }
    icon={PlusCircleIcon}
    variant={EmptyStateVariant.xs}
    data-testid="cluster-storage-empty-state"
  >
    <EmptyStateBody>
      To save your project&apos;s data, attach cluster storage to your workbench. Your data will not
      persist without storage.
    </EmptyStateBody>
  </EmptyState>
);
