import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import alignment from '@patternfly/react-styles/css/utilities/Alignment/alignment';
import * as React from 'react';

type ModelServingPlatformSelectErrorAlertProps = {
  error: Error;
  clearError: () => void;
};

const ModelServingPlatformSelectErrorAlert: React.FC<ModelServingPlatformSelectErrorAlertProps> = ({
  error,
  clearError,
}) => (
  <Alert
    variant="danger"
    isInline
    title="Model serving platform selection failed"
    actionClose={<AlertActionCloseButton onClose={clearError} />}
    isExpandable={!!error.message}
    className={alignment.textAlignStart}
    data-testid="error-selecting-serving-platform"
  >
    <p>{error.message}</p>
  </Alert>
);

export default ModelServingPlatformSelectErrorAlert;
