import React from 'react';
import useTrustyAINamespaceCR, {
  isTrustyAIAvailable,
  taiHasServerTimedOut,
} from '~/concepts/trustyai/useTrustyAINamespaceCR';
import { createTrustyAICR, deleteTrustyAICR } from '~/api';

const useManageTrustyAICR = (namespace: string): UseManageTrustyAICRReturnType => {
  const state = useTrustyAINamespaceCR(namespace);
  const [cr, loaded, serviceError, refresh] = state;

  const [installReqError, setInstallReqError] = React.useState<Error | undefined>();

  const isAvailable = isTrustyAIAvailable(state);
  const isProgressing = loaded && !!cr && !isAvailable;
  const error = installReqError || serviceError;

  const [disableTimeout, setDisableTimeout] = React.useState(false);
  const serverTimedOut = !disableTimeout && taiHasServerTimedOut(state, isAvailable);
  const ignoreTimedOut = React.useCallback(() => {
    setDisableTimeout(true);
  }, []);

  const showSuccess = React.useRef(false);
  if (isProgressing) {
    showSuccess.current = true;
  }

  const installCR = React.useCallback(async () => {
    await createTrustyAICR(namespace)
      .then(refresh)
      .catch((e) => setInstallReqError(e));
  }, [namespace, refresh]);

  const deleteCR = React.useCallback(async () => {
    await deleteTrustyAICR(namespace).then(refresh);
  }, [namespace, refresh]);

  return {
    error,
    isProgressing,
    isAvailable,
    showSuccess: showSuccess.current,
    isSettled: loaded,
    serverTimedOut,
    ignoreTimedOut,
    installCR,
    deleteCR,
  };
};

export default useManageTrustyAICR;

type UseManageTrustyAICRReturnType = {
  error: Error | undefined;
  isProgressing: boolean;
  isAvailable: boolean;
  showSuccess: boolean;
  isSettled: boolean;
  serverTimedOut: boolean;
  ignoreTimedOut: () => void;
  installCR: () => Promise<void>;
  deleteCR: () => Promise<void>;
};
