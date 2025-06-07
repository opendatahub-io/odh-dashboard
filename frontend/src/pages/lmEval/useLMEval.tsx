import React from 'react';
import useFetch, { FetchStateObject } from '#~/utilities/useFetch';
import { LMEvalKind } from '#~/k8sTypes';
import { listModelEvaluations } from '#~/api';

const useLMEval = (namespace?: string): FetchStateObject<LMEvalKind[]> => {
  const getLMEval = React.useCallback(() => listModelEvaluations(namespace ?? ''), [namespace]);
  return useFetch<LMEvalKind[]>(getLMEval, []);
};

export default useLMEval;
