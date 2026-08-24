import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

interface RunInProgressProps {
  productName: string;
  /** Empty-state icon, e.g. `() => <img src={emptyStateImage} alt="Run in progress" />`. */
  icon: React.ComponentType;
  /** Route the "View my {productName} runs" button navigates to. */
  viewRunsRoute: string;
  'data-testid'?: string;
}

function RunInProgress({
  productName,
  icon,
  viewRunsRoute,
  'data-testid': testId = 'run-in-progress',
}: RunInProgressProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <EmptyState
      titleText={`Your ${productName} run is currently in progress`}
      headingLevel="h4"
      icon={icon}
      data-testid={testId}
    >
      <EmptyStateBody>
        Please check back soon for your run results. Runs can take some time to complete.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            onClick={() => {
              navigate(viewRunsRoute);
            }}
          >
            View my {productName} runs
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export default RunInProgress;
