import * as React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { ALERT_TIMEOUT_MS } from '~/app/Chatbot/const';

interface SourceDeleteSuccessAlertProps {
  isVisible: boolean;
  alertKey: number;
  onClose: () => void;
}

const SourceDeleteSuccessAlert: React.FunctionComponent<SourceDeleteSuccessAlertProps> = ({
  isVisible,
  alertKey,
  onClose,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      key={`source-delete-success-${alertKey}`}
      isInline
      variant="success"
      title="Source deleted"
      timeout={ALERT_TIMEOUT_MS}
      actionClose={<AlertActionCloseButton onClose={onClose} />}
      onTimeout={onClose}
    >
      <p>The source has been successfully deleted from your vector store.</p>
    </Alert>
  );
};

export default SourceDeleteSuccessAlert;
