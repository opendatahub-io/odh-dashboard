import React from 'react';
import {
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Title,
} from '@patternfly/react-core';
import { LockIcon, PlusCircleIcon } from '@patternfly/react-icons';

type ClusterStorageEmptyStateProps = {
  permissionDenied?: boolean;
};

export const ClusterStorageEmptyState: React.FC<ClusterStorageEmptyStateProps> = ({
  permissionDenied = false,
}) => {
  if (permissionDenied) {
    return (
      <EmptyState
        titleText={
          <Title headingLevel="h2" size="lg">
            Access permissions needed
          </Title>
        }
        icon={LockIcon}
        variant={EmptyStateVariant.xs}
        data-testid="cluster-storage-permission-error"
      >
        <EmptyStateBody>
          <Content component="small">
            To access cluster storage, ask your administrator to adjust your permissions.
          </Content>
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
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
        To save your project&apos;s data, attach cluster storage to your workbench. Your data will
        not persist without storage.
      </EmptyStateBody>
    </EmptyState>
  );
};
