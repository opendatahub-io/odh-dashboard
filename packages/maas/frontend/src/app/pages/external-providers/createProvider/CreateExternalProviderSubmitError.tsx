import * as React from 'react';
import { Alert } from '@patternfly/react-core';

type CreateExternalProviderSubmitErrorProps = {
  error?: string;
  dataTestId?: string;
  title?: string;
};

const CreateExternalProviderSubmitError: React.FC<CreateExternalProviderSubmitErrorProps> = ({
  error,
  dataTestId = 'create-external-provider-error',
  title = 'Failed to create external provider',
}) => {
  if (!error) {
    return null;
  }

  return (
    <Alert variant="danger" isInline title={title} data-testid={dataTestId}>
      {error}
    </Alert>
  );
};

export default CreateExternalProviderSubmitError;
