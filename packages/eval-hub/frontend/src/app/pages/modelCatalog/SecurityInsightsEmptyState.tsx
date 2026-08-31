import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
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
      No safety and security evaluation data is available for this model yet. Run an evaluation to
      generate safety and security insights.
    </EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button
          variant="link"
          component={(props) => <Link {...props} to="/evaluation" />}
          data-testid="security-insights-empty-state-link"
        >
          Go to Evaluations
        </Button>
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

export default SecurityInsightsEmptyState;
