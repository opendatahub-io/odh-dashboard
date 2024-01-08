import { Bullseye, Spinner, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import useManageTrustyAICR from '~/concepts/trustyai/useManageTrustyAICR';
import TrustyAIServiceNotification from '~/concepts/trustyai/content/TrustyAIServiceNotification';
import InstallTrustyAICheckbox from './InstallTrustyAICheckbox';

type TrustyAIServiceControlProps = {
  namespace: string;
  disabled: boolean;
  disabledReason?: string;
};
const TrustyAIServiceControl: React.FC<TrustyAIServiceControlProps> = ({
  namespace,
  disabled,
  disabledReason,
}) => {
  const {
    isAvailable,
    isProgressing,
    showSuccess,
    installCR,
    deleteCR,
    error,
    isSettled,
    serverTimedOut,
    ignoreTimedOut,
  } = useManageTrustyAICR(namespace);

  const [userStartedInstall, setUserStartedInstall] = React.useState(false);

  if (!disabled && !isSettled) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <InstallTrustyAICheckbox
          disabled={disabled}
          disabledReason={disabledReason}
          isAvailable={isAvailable}
          isProgressing={isProgressing}
          onInstall={() => {
            setUserStartedInstall(true);
            return installCR().finally(() => setUserStartedInstall(false));
          }}
          onDelete={deleteCR}
        />
      </StackItem>
      <StackItem>
        <TrustyAIServiceNotification
          loading={userStartedInstall || isProgressing}
          showSuccess={showSuccess}
          isAvailable={isAvailable}
          error={error}
          timedOut={serverTimedOut}
          ignoreTimedOut={ignoreTimedOut}
          deleteCR={deleteCR}
        />
      </StackItem>
    </Stack>
  );
};

export default TrustyAIServiceControl;
