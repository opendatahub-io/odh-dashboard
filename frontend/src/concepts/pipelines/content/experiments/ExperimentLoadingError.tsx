import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

interface ExperimentLoadingErrorProps {
  error: Error;
}

const ExperimentLoadingError: React.FC<ExperimentLoadingErrorProps> = ({ error }) => (
  <Bullseye>
    <EmptyState>
      <EmptyStateHeader
        titleText="There was an issue loading experiments"
        icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
        headingLevel="h2"
      />
      <EmptyStateBody>{error.message}</EmptyStateBody>
    </EmptyState>
  </Bullseye>
);

export default ExperimentLoadingError;
