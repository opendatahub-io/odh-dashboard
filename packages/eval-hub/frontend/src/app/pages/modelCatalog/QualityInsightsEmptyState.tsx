import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { evalHubRootPath } from '~/app/utilities/routes';

const QualityInsightsEmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h3"
      icon={SearchIcon}
      titleText="No quality insights"
      variant={EmptyStateVariant.sm}
      data-testid="quality-insights-empty-state"
    >
      <EmptyStateBody>
        No quality evaluation data is available for this model yet. Run an evaluation to generate
        quality insights.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="link"
            onClick={() => navigate(evalHubRootPath)}
            data-testid="quality-insights-empty-state-link"
          >
            Go to Evaluations
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default QualityInsightsEmptyState;
