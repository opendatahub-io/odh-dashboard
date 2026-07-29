import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

const SecurityInsightsEmptyState: React.FC = () => (
  <EmptyState
    headingLevel="h3"
    icon={SearchIcon}
    titleText="No safety and security insights"
    variant={EmptyStateVariant.sm}
    data-testid="security-insights-empty-state"
  >
    <EmptyStateBody>
      No safety and security evaluation data is available for this model yet.
    </EmptyStateBody>
  </EmptyState>
);

export default SecurityInsightsEmptyState;
