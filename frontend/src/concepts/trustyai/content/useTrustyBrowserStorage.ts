import * as React from 'react';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { TrustyAIKind } from '#~/k8sTypes';

/** { [namespace]: uid } */
type TrustyStorageState = Record<string, string | undefined>;

export type UseTrustyBrowserStorage = {
  showSuccess: boolean;
  onDismissSuccess: () => void;
};

const useTrustyBrowserStorage = (cr?: TrustyAIKind | null): UseTrustyBrowserStorage => {
  const [trustyStorageState, setTrustyStorageState] = useBrowserStorage<TrustyStorageState>(
    'odh.dashboard.project.trusty',
    {},
  );
  const [showSuccess, setShowSuccess] = React.useState(false);

  const { namespace, uid } = cr?.metadata || {};

  // Ignore watching this value for changes in the hooks
  const storageRef = React.useRef(trustyStorageState);
  storageRef.current = trustyStorageState;

  React.useEffect(() => {
    if (namespace && uid) {
      const matchingUID = storageRef.current[namespace];
      if (matchingUID !== uid) {
        // Don't have a dismiss state or it does not match the current instance
        setShowSuccess(true);
      } else if (uid) {
        // If somehow it's showing and dismissed, hide it
        setShowSuccess(false);
      }
    }
  }, [namespace, uid]);

  const onDismissSuccess = React.useCallback<UseTrustyBrowserStorage['onDismissSuccess']>(() => {
    // Immediate feedback
    setShowSuccess(false);

    if (!namespace) {
      // Likely improperly called -- shouldn't be able to dismiss a situation without namespace
      return;
    }

    // Update the state
    setTrustyStorageState({ ...storageRef.current, [namespace]: uid });
  }, [namespace, setTrustyStorageState, uid]);

  return {
    showSuccess,
    onDismissSuccess,
  };
};

export default useTrustyBrowserStorage;
