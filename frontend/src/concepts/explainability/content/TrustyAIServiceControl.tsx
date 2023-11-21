import { Bullseye, Spinner, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import useManageTrustyAICR from '~/concepts/explainability/useManageTrustyAICR';
import TrustyAIServiceNotification from '~/concepts/explainability/content/TrustyAIServiceNotification';
import InstallTrustyAICheckbox from './InstallTrustyAICheckbox';

type TrustyAIServiceControlProps = {
  namespace: string;
};
const TrustyAIServiceControl: React.FC<TrustyAIServiceControlProps> = ({ namespace }) => {
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

  if (!isSettled) {
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
