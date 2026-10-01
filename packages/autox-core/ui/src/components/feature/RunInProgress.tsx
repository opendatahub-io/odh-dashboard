import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionableEmptyState } from '../primitive';

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
    <ActionableEmptyState
      titleText={`Your ${productName} run is currently in progress`}
      icon={icon}
      body="Please check back soon for your run results. Runs can take some time to complete."
      action={{
        label: `View my ${productName} runs`,
        onClick: () => navigate(viewRunsRoute),
      }}
      data-testid={testId}
    />
  );
}

export default RunInProgress;
