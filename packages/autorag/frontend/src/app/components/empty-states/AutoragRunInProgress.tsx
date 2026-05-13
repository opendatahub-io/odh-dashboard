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

interface AutoragRunInProgressProps {
  namespace: string;
}

const EmptyStateImageIcon = () => <img src={emptyStateImage} alt="Run in progress" />;

function AutoragRunInProgress({ namespace }: AutoragRunInProgressProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <EmptyState
      titleText="Your AutoRAG run is currently in progress"
      headingLevel="h4"
      icon={EmptyStateImageIcon}
    >
      <EmptyStateBody>
        Please check back soon for your run results. Runs can take some time to complete.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            onClick={() => {
              navigate(`/gen-ai-studio/autorag/experiments/${namespace}`);
            }}
          >
            View my AutoRAG runs
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export default AutoragRunInProgress;
