import React from 'react';
import useTrustyAINamespaceCR, {
  isTrustyAIAvailable,
  taiHasServerTimedOut,
} from '~/concepts/explainability/useTrustyAINamespaceCR';
import { createTrustyAICR, deleteTrustyAICR } from '~/api';

const useManageTrustyAICR = (namespace: string) => {
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

  const installCR = React.useCallback(
    () =>
      createTrustyAICR(namespace)
        .then(refresh)
        .catch((e) => setInstallReqError(e)),
    [namespace, refresh],
  );

  const deleteCR = React.useCallback(
    () => deleteTrustyAICR(namespace).then(refresh),
    [namespace, refresh],
  );

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
