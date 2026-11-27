import React from 'react';
import { Alert, Button } from '@patternfly/react-core';

type DatasetSamplingErrorProps = {
  error?: Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export default function DatasetSamplingError({
  error,
  onRetry,
  isRetrying = false,
}: DatasetSamplingErrorProps): React.JSX.Element {
  const isCsvValidationError = error?.message.includes('CSV validation error:') ?? false;
  const isSamplingLimitError = isCsvValidationError && error?.message.includes('within 1 MiB');
  if (isCsvValidationError) {
    return (
      <Alert
        variant="danger"
        isInline
        title="Unable to sample document data"
        data-testid="dataset-sampling-error"
      >
        {isSamplingLimitError
          ? 'The first 100 complete data rows must fit within the 1 MiB sampling limit. Reduce the size of those rows or select a different CSV file.'
          : 'Use a UTF-8 CSV file with a header and at least 100 data rows. Correct the document and select it again, or upload a different document.'}
      </Alert>
    );
  }
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
