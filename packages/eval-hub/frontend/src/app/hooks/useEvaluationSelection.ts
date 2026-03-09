import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Collection, FlatBenchmark } from '~/app/types';
import {
  evaluationBenchmarksRoute,
  evaluationCollectionsRoute,
  evaluationCreateRoute,
} from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import { useProviders } from '~/app/hooks/useProviders';
import { useCollections } from '~/app/hooks/useCollections';

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
  const notification = useNotification();

  const flowType = searchParams.get('type');
  const providerId = searchParams.get('providerId');
  const benchmarkId = searchParams.get('benchmarkId');
  const collectionId = searchParams.get('collectionId');

  const isBenchmarkFlow = flowType === 'benchmark' && !!providerId && !!benchmarkId;
  const isCollectionFlow = flowType === 'collection' && !!collectionId;

  const {
    providers,
    loaded: providersLoaded,
    loadError: providersError,
  } = useProviders(isBenchmarkFlow ? (namespace ?? '') : '');
  const {
    collections,
    loaded: collectionsLoaded,
    loadError: collectionsError,
  } = useCollections(isCollectionFlow ? (namespace ?? '') : '');

  const benchmark = React.useMemo<FlatBenchmark | undefined>(() => {
    if (!isBenchmarkFlow || !providersLoaded) {
      return undefined;
    }
    const provider = providers.find((p) => p.resource.id === providerId);
    if (!provider) {
      return undefined;
    }
    const found = provider.benchmarks?.find((b) => b.id === benchmarkId);
    if (!found) {
      return undefined;
    }
    return { ...found, providerId: provider.resource.id };
  }, [isBenchmarkFlow, providersLoaded, providers, providerId, benchmarkId]);

  const collection = React.useMemo<Collection | undefined>(() => {
    if (!isCollectionFlow || !collectionsLoaded) {
      return undefined;
    }
    return collections.find((c) => c.resource.id === collectionId);
  }, [isCollectionFlow, collectionsLoaded, collections, collectionId]);

  const loadError = isBenchmarkFlow
    ? providersError
    : isCollectionFlow
      ? collectionsError
      : undefined;

  const dataLoaded = isBenchmarkFlow
    ? providersLoaded || !!providersError
    : isCollectionFlow
      ? collectionsLoaded || !!collectionsError
      : true;
  const hasValidSelection = !!benchmark || !!collection;

  React.useEffect(() => {
    if (!isBenchmarkFlow && !isCollectionFlow) {
      navigate(evaluationCreateRoute(namespace), { replace: true });
    } else if (dataLoaded && !loadError && !hasValidSelection) {
      notification.warning(
        'Selection not found',
        'The selected benchmark or collection could not be found. Please select again.',
      );
      navigate(
        isBenchmarkFlow
          ? evaluationBenchmarksRoute(namespace)
          : evaluationCollectionsRoute(namespace),
        { replace: true },
      );
    }
  }, [
    isBenchmarkFlow,
    isCollectionFlow,
    dataLoaded,
    loadError,
    hasValidSelection,
    navigate,
    namespace,
    notification,
  ]);

  return { benchmark, collection, isCollectionFlow, dataLoaded, loadError };
};
