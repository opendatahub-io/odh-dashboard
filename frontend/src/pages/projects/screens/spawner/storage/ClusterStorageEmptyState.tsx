import React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  Title,
  EmptyStateBody,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

export const ClusterStorageEmptyState: React.FC = () => (
  <EmptyState variant={EmptyStateVariant.xs} data-testid="cluster-storage-empty-state">
    <EmptyStateIcon icon={PlusCircleIcon} />
    <Title headingLevel="h2" size="lg">
      No cluster storage
    </Title>
    <EmptyStateBody>
      To save your project&apos;s data, attach cluster storage to your workbench. Your data will not
      persist without storage.
    </EmptyStateBody>
  </EmptyState>
);
