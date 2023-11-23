import { Alert, AlertActionCloseButton, Bullseye, Spinner } from '@patternfly/react-core';
import React from 'react';
import TrustyAITimedOutError from '~/concepts/explainability/content/TrustyAIServerTimedOutError';

type TrustyAIServiceNotificationProps = {
  error?: Error;
  isAvailable: boolean;
  showSuccess: boolean;
  loading: boolean;
  timedOut: boolean;
  ignoreTimedOut: () => void;
  deleteCR: () => Promise<unknown>;
};

const TrustyAIServiceNotification: React.FC<TrustyAIServiceNotificationProps> = ({
  error,
  isAvailable,
  showSuccess,
  loading,
  timedOut,
  ignoreTimedOut,
  deleteCR,
}) => {
  const [dismissSuccess, setDismissSuccess] = React.useState(false);

  React.useEffect(() => {
    if (loading) {
      setDismissSuccess(false);
    }
  }, [loading]);

  if (timedOut) {
    return <TrustyAITimedOutError ignoreTimedOut={ignoreTimedOut} deleteCR={deleteCR} />;
  }

  if (loading) {
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
