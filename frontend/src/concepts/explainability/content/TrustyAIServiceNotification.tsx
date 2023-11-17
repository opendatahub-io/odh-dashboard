import { Alert, AlertActionCloseButton, Bullseye, Spinner } from '@patternfly/react-core';
import React from 'react';

type TrustyAIServiceNotificationProps = {
  error?: Error;
  isAvailable: boolean;
  showSuccess: boolean;
  loading: boolean;
};

const TrustyAIServiceNotification: React.FC<TrustyAIServiceNotificationProps> = ({
  error,
  isAvailable,
  showSuccess,
  loading,
}) => {
  const [dismissSuccess, setDismissSuccess] = React.useState(false);

  if (loading) {
    if (dismissSuccess) {
      setDismissSuccess(false);
    }
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!dismissSuccess && showSuccess && isAvailable) {
    return (
      <Alert
        variant="success"
        title="TrustyAI installed"
        actionClose={<AlertActionCloseButton onClose={() => setDismissSuccess(true)} />}
        isLiveRegion
        isInline
      >
        The TrustyAI service was successfully installed
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" title="TrustyAI service error" isLiveRegion isInline>
        {error?.message}
      </Alert>
    );
  }

  return null;
};

export default TrustyAIServiceNotification;
