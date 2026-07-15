import * as React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { ALERT_TIMEOUT_MS } from '~/app/Chatbot/const';

interface TranscriptionSuccessAlertProps {
  isVisible: boolean;
  alertKey: number;
  onClose: () => void;
}

const TranscriptionSuccessAlert: React.FunctionComponent<TranscriptionSuccessAlertProps> = ({
  isVisible,
  alertKey,
  onClose,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      key={`transcription-success-${alertKey}`}
      isInline
      variant="success"
      title="Transcription complete"
      timeout={ALERT_TIMEOUT_MS}
      actionClose={<AlertActionCloseButton onClose={onClose} />}
      onTimeout={onClose}
    />
  );
};

export default TranscriptionSuccessAlert;
