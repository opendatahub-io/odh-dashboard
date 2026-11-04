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
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

// Root path of the Evaluations (Eval Hub) pages, linked from the empty state
// only when the LM Eval area is available.
const EVALUATION_ROOT_PATH = '/evaluation';

const SecurityInsightsEmptyState: React.FC = () => {
  const evaluationsAvailable = useIsAreaAvailable(SupportedArea.LM_EVAL).status;

  return (
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
      {evaluationsAvailable && (
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="link"
              component={(props) => <Link {...props} to={EVALUATION_ROOT_PATH} />}
              data-testid="security-insights-empty-state-link"
            >
              Go to Evaluations
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      )}
    </EmptyState>
  );
};

export default SecurityInsightsEmptyState;
