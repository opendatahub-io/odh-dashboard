import React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Collection, FlatBenchmark } from '~/app/types';
import { evaluationCreateRoute } from '~/app/routes';

const hasBenchmark = (state: unknown): state is { benchmark: FlatBenchmark } =>
  typeof state === 'object' && state !== null && 'benchmark' in state;

const hasCollection = (state: unknown): state is { collection: Collection } =>
  typeof state === 'object' && state !== null && 'collection' in state;

type UseEvaluationSelectionResult = {
  benchmark: FlatBenchmark | undefined;
  collection: Collection | undefined;
  isCollectionFlow: boolean;
  dataLoaded: boolean;
  loadError: Error | undefined;
};

export const useEvaluationSelection = (
  namespace: string | undefined,
): UseEvaluationSelectionResult => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const flowType = searchParams.get('type');
  const isBenchmarkFlow = flowType === 'benchmark';
  const isCollectionFlow = flowType === 'collection';

  // Data is passed via router navigation state from the chooser pages.
  // No API re-fetch needed — the chooser pages already fetched this data.
  const benchmark =
    isBenchmarkFlow && hasBenchmark(location.state) ? location.state.benchmark : undefined;
  const collection =
    isCollectionFlow && hasCollection(location.state) ? location.state.collection : undefined;

  React.useEffect(() => {
    if (!isBenchmarkFlow && !isCollectionFlow) {
      navigate(evaluationCreateRoute(namespace), { replace: true });
    }
  }, [isBenchmarkFlow, isCollectionFlow, navigate, namespace]);

  return {
    benchmark,
    collection,
    isCollectionFlow,
    dataLoaded: true,
    loadError: undefined,
  };
};
