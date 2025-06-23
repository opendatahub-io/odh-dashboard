import React from 'react';
import useFetch, { FetchStateObject } from '#~/utilities/useFetch';
import { LMEvalKind } from '#~/k8sTypes';
import { getModelEvaluationResult } from '#~/api';

const useLMEvalResult = (
  evaluationName: string | undefined,
  namespace: string | undefined,
): FetchStateObject<LMEvalKind | null> => {
  const getLMEvalResult = React.useCallback(() => {
    if (!evaluationName || !namespace) {
      return Promise.resolve(null);
    }
    return getModelEvaluationResult(evaluationName, namespace);
  }, [evaluationName, namespace]);

  return useFetch<LMEvalKind | null>(getLMEvalResult, null);
};

export default useLMEvalResult;
