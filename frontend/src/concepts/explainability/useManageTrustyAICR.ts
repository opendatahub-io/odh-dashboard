import React from 'react';
import useTrustyAINamespaceCR from '~/concepts/explainability/useTrustyAINamespaceCR';
import { createTrustyAICR, deleteTrustyAICR } from '~/api';

const useManageTrustyAICR = (namespace: string) => {
  const [trustyCR, , error, refresh] = useTrustyAINamespaceCR(namespace);

  const installCR = React.useCallback(() => {
    if (trustyCR) {
      return Promise.reject(
        new Error(`A TrustyAI service instance already exists in namespace: ${namespace}`),
      );
    }

    return createTrustyAICR(namespace);
  }, [namespace, trustyCR]);

  const deleteCR = React.useCallback(() => {
    if (!trustyCR) {
      return Promise.reject(
        new Error(`Could not find a TrustyAI service instance in namespace: ${namespace}`),
      );
    }

    return deleteTrustyAICR(namespace);
  }, [namespace, trustyCR]);

  return {
    hasCR: !!trustyCR,
    error,
    refresh,
    installCR,
    deleteCR,
  };
};

export default useManageTrustyAICR;
