import * as React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { ALERT_TIMEOUT_MS } from '~/app/Chatbot/const';

interface SourceUploadErrorAlertProps {
  isVisible: boolean;
  alertKey: number;
  onClose: () => void;
}

const SourceUploadErrorAlert: React.FunctionComponent<SourceUploadErrorAlertProps> = ({
  isVisible,
  alertKey,
  onClose,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      key={`source-upload-error-${alertKey}`}
      isInline
      variant="danger"
      title="Failed to upload source"
      timeout={ALERT_TIMEOUT_MS}
      actionClose={<AlertActionCloseButton onClose={onClose} />}
      onTimeout={onClose}
    >
      <p>Please try again.</p>
    </Alert>
  );
};

export default SourceUploadErrorAlert;
