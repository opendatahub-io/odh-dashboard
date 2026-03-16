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

interface EmptyExperimentsStateProps {
  createExperimentRoute: string;
  dataTestId?: string;
}

const EmptyExperimentsState: React.FC<EmptyExperimentsStateProps> = ({
  createExperimentRoute,
  dataTestId = 'empty-experiments-state',
}) => {
  const navigate = useNavigate();

  return (
    <EmptyState
      data-testid={dataTestId}
      titleText="No experiments yet"
      icon={PlusCircleIcon}
      headingLevel="h2"
    >
      <EmptyStateBody>
        To get started, create an AutoML experiment to configure and run your machine learning
        workflow.
      </EmptyStateBody>

      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            data-testid="create-experiment-button"
            variant="primary"
            onClick={() => navigate(createExperimentRoute)}
          >
            Create AutoML experiment
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyExperimentsState;
