import * as React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { ALERT_TIMEOUT_MS } from '~/app/Chatbot/const';

interface SourceUploadSuccessAlertProps {
  isVisible: boolean;
  alertKey: number;
  onClose: () => void;
}

const SourceUploadSuccessAlert: React.FunctionComponent<SourceUploadSuccessAlertProps> = ({
  isVisible,
  alertKey,
  onClose,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      key={`source-upload-success-${alertKey}`}
      isInline
      variant="success"
      title="Source uploaded"
      timeout={ALERT_TIMEOUT_MS}
      actionClose={<AlertActionCloseButton onClose={onClose} />}
      onTimeout={onClose}
    >
      <p>
        This source must be chunked and embedded before it is available for retrieval. This may take
        a few minutes depending on the size.
      </p>
    </Alert>
  );
};

export default SourceUploadSuccessAlert;
