import React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import type { FlatBenchmark } from '~/app/types';
import { evaluationEvaluateRoute } from '~/app/routes';

const hasBenchmark = (state: unknown): state is { benchmark: FlatBenchmark } =>
  typeof state === 'object' &&
  state !== null &&
  'benchmark' in state &&
  typeof state.benchmark === 'object' &&
  state.benchmark !== null;

type UseEvaluationSelectionResult = {
  benchmark: FlatBenchmark | undefined;
  dataLoaded: boolean;
  loadError: Error | undefined;
};

export const useEvaluationSelection = (
  namespace: string | undefined,
  skipRedirect = false,
): UseEvaluationSelectionResult => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const flowType = searchParams.get('type');

  // The benchmark selector passes its selection through router navigation state,
  // so this page does not need to fetch provider or benchmark data again.
  const benchmark =
    flowType === 'benchmark' && hasBenchmark(location.state) ? location.state.benchmark : undefined;
  const isBenchmarkFlow = benchmark !== undefined;

  React.useEffect(() => {
    if (!skipRedirect && !isBenchmarkFlow) {
      navigate(evaluationEvaluateRoute(namespace), { replace: true });
    }
  }, [skipRedirect, isBenchmarkFlow, navigate, namespace]);

  return {
    benchmark,
    dataLoaded: true,
    loadError: undefined,
  };
};
