import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';

const EvalHubEmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h2"
      icon={SearchIcon}
      titleText="No evaluation runs"
      variant={EmptyStateVariant.lg}
      data-testid="eval-hub-empty-state"
    >
      <EmptyStateBody data-testid="eval-hub-empty-state-body">
        Go to collections to create a collection or run an individual benchmark, or select a
        different project to view its runs.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            data-testid="create-evaluation-button"
            onClick={() => {
              navigate({ search: '?tab=evaluate' });
            }}
          >
            View collections
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EvalHubEmptyState;
