import React from 'react';
import { Bullseye, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import UnauthorizedError from '@odh-dashboard/ui-core/components/UnauthorizedError';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';

interface ExperimentLoadingErrorProps {
  error: Error;
}

const ExperimentLoadingError: React.FC<ExperimentLoadingErrorProps> = ({ error }) => {
  if (getGenericErrorCode(error) === 403) {
    return <UnauthorizedError accessDomain="experiments" />;
  }

  return (
    <Bullseye>
      <EmptyState
        headingLevel="h2"
        titleText="There was an issue loading experiments"
        icon={ExclamationCircleIcon}
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};

export default ExperimentLoadingError;
