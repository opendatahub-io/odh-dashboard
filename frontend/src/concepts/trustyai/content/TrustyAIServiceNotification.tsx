import { Alert, AlertActionCloseButton, Bullseye, Spinner } from '@patternfly/react-core';
import React from 'react';
import TrustyAITimedOutError from '~/concepts/trustyai/content/TrustyAIServerTimedOutError';

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
        data-testid="trustyai-service-installed-alert"
        variant="success"
        title="TrustyAI installed in your namespace"
        actionClose={<AlertActionCloseButton onClose={() => setDismissSuccess(true)} />}
        isLiveRegion
        isInline
      />
    );
  }

  if (error) {
    return (
      <Alert
        variant="danger"
        title="TrustyAI service error"
        isLiveRegion
        isInline
        data-testid="trustyai-service-error"
      >
        {error.message}
      </Alert>
    );
  }

  return null;
};

export default TrustyAIServiceNotification;
