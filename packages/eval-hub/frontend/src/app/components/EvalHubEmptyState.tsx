import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const EvalHubEmptyState: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={CubesIcon}
    titleText="No existing evaluation runs"
    variant={EmptyStateVariant.lg}
    data-testid="eval-hub-empty-state"
  >
    <EmptyStateBody data-testid="eval-hub-empty-state-body">
      No evaluation runs have been started in this project. Start a new evaluation run, or select a
      different project.
    </EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button variant="primary" data-testid="create-evaluation-button">
          Create new evaluation
        </Button>
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

export default EvalHubEmptyState;
