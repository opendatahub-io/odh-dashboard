import * as React from 'react';
import { Alert } from '@patternfly/react-core';

type CreateExternalProviderSubmitErrorProps = {
  error?: string;
  dataTestId?: string;
};

const CreateExternalProviderSubmitError: React.FC<CreateExternalProviderSubmitErrorProps> = ({
  error,
  dataTestId = 'create-external-provider-error',
}) => {
  if (!error) {
    return null;
  }

  return (
    <Alert
      variant="danger"
      isInline
      title="Failed to create external provider"
      data-testid={dataTestId}
    >
      {error}
    </Alert>
  );
};

export default CreateExternalProviderSubmitError;
