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
      titleText="No evaluation runs"
      variant={EmptyStateVariant.lg}
      data-testid="eval-hub-empty-state"
    >
      <EmptyStateBody data-testid="eval-hub-empty-state-body">
        Start an evaluation run, or select a different project to view its runs.
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
            Start evaluation run
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EvalHubEmptyState;
