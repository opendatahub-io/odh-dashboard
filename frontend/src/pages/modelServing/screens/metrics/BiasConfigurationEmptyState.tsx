import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

const BiasConfigurationEmptyState: React.FC = () => (
  <EmptyState variant={EmptyStateVariant.large} data-id="empty-empty-state">
    <EmptyStateIcon icon={PlusCircleIcon} />
    <Title headingLevel="h2" size="lg">
      No bias metrics configured
    </Title>
    <EmptyStateBody>
      No bias metrics for this model have been configured. To monitor model bias, you must first
      configure metrics
    </EmptyStateBody>
  </EmptyState>
);

export default BiasConfigurationEmptyState;
