import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { SecurityIcon } from '@patternfly/react-icons';

const SecurityInsightsEmptyState: React.FC = () => (
  <EmptyState
    variant={EmptyStateVariant.sm}
    data-testid="security-insights-empty-state"
    icon={SecurityIcon}
    titleText="No security artifacts found"
  >
    <EmptyStateBody>
      No security metrics or scan results are available for this model version. Security artifacts
      are published by the model provider and may not be available for all models.
    </EmptyStateBody>
  </EmptyState>
);

export default SecurityInsightsEmptyState;
