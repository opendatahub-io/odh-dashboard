import React from 'react';
import useTrustyAINamespaceCR, {
  isTrustyAIAvailable,
} from '~/concepts/explainability/useTrustyAINamespaceCR';
import { createTrustyAICR, deleteTrustyAICR } from '~/api';

const useManageTrustyAICR = (namespace: string) => {
  const state = useTrustyAINamespaceCR(namespace);
  const [cr, loaded, serviceError, refresh] = state;

  const [installReqError, setInstallReqError] = React.useState<Error | undefined>();
  const showSuccess = React.useRef(false);

  const isAvailable = isTrustyAIAvailable(state);
  const isProgressing = loaded && !!cr && !isAvailable;
  const error = installReqError || serviceError;

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
    installCR,
    deleteCR,
  };
};

export default useManageTrustyAICR;
