import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import emptyStateImage from '~/app/bgimages/empty-state.svg';

interface AutomlRunInProgressProps {
  namespace: string;
}

const EmptyStateImageIcon = () => <img src={emptyStateImage} alt="Run in progress" />;

function AutomlRunInProgress({ namespace }: AutomlRunInProgressProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <EmptyState
      titleText="Your AutoML run is currently in progress"
      headingLevel="h4"
      icon={EmptyStateImageIcon}
      data-testid="automl-run-in-progress"
    >
      <EmptyStateBody>
        Please check back soon for your run results. Runs can take some time to complete.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            onClick={() => {
              navigate(`/develop-train/automl/experiments/${namespace}`);
            }}
          >
            View my AutoML runs
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export default AutomlRunInProgress;
