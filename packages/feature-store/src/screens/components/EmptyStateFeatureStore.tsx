import React from 'react';
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

type EmptyStateFeatureStoreType = {
  testid?: string;
  title: string;
  description: React.ReactNode;
  headerIcon?: React.ComponentType;
  customAction?: React.ReactNode;
};

const EmptyStateFeatureStore: React.FC<EmptyStateFeatureStoreType> = ({
  testid,
  title,
  description,
  headerIcon,
  customAction,
}) => (
  <EmptyState
    icon={headerIcon ?? PlusCircleIcon}
    titleText={title}
    variant={EmptyStateVariant.sm}
    data-testid={testid}
  >
    <EmptyStateBody>{description}</EmptyStateBody>
    <EmptyStateFooter>
      {customAction && <EmptyStateActions>{customAction}</EmptyStateActions>}
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyStateFeatureStore;
