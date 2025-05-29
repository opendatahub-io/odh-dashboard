import React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

import { PipelineRunTabTitle } from '#~/pages/pipelines/global/runs/types';

interface EmptyRunsStateProps {
  createRunRoute: string;
  dataTestId: string;
}

export const EmptyRunsState: React.FC<EmptyRunsStateProps> = ({ createRunRoute, dataTestId }) => {
  const navigate = useNavigate();

  return (
    <EmptyState
      data-testid={dataTestId}
      titleText="No runs"
      icon={PlusCircleIcon}
      headingLevel="h2"
    >
      <EmptyStateBody>
        To get started, create a run. Alternatively, go to the{' '}
        <b>{PipelineRunTabTitle.SCHEDULES}</b> tab and create a schedule to execute recurring runs.
      </EmptyStateBody>

      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            data-testid="create-run-button"
            variant="primary"
            onClick={() => navigate(createRunRoute)}
          >
            Create run
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};
