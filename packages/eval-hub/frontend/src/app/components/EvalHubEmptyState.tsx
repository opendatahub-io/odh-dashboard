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
import { fireSimpleTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

const EvalHubEmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h2"
      icon={SearchIcon}
      titleText="No existing evaluation runs"
      variant={EmptyStateVariant.lg}
      data-testid="eval-hub-empty-state"
    >
      <EmptyStateBody data-testid="eval-hub-empty-state-body">
        No evaluation runs have been started in this project. Start a new evaluation run, or select
        a different project.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            data-testid="create-evaluation-button"
            onClick={() => {
              fireSimpleTrackingEvent(EVAL_HUB_EVENTS.START_EVALUATION_SELECTED);
              navigate('create');
            }}
          >
            Create new evaluation
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EvalHubEmptyState;
