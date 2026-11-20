import React from 'react';
import { Alert, Button } from '@patternfly/react-core';

type DatasetSamplingErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export default function DatasetSamplingError({
  onRetry,
  isRetrying = false,
}: DatasetSamplingErrorProps): React.JSX.Element {
  return (
    <Alert
      variant="danger"
      isInline
      title="Unable to sample document data"
      data-testid="dataset-sampling-error"
    >
      An error occurred while sampling data from this document.{' '}
      {onRetry ? (
        <Button
          variant="link"
          isInline
          onClick={onRetry}
          isDisabled={isRetrying}
          isLoading={isRetrying}
          data-testid="dataset-sampling-retry"
        >
          Try again
        </Button>
      ) : (
        'Select the file again'
      )}
      , or upload a different document.
    </Alert>
  );
}
