import * as React from 'react';
import type { Collection } from '~/app/types';
import { useProviders } from '~/app/hooks/useProviders';
import type { BenchmarkWithProvider } from '~/app/components/CollectionDrawerPanel';

type UseCollectionDrawerResult = {
  selectedCollection: Collection | undefined;
  benchmarkDetailsMap: Map<string, BenchmarkWithProvider>;
  selectCollection: (collection: Collection) => void;
  closeDrawer: () => void;
};

export const useCollectionDrawer = (namespace: string): UseCollectionDrawerResult => {
  const [selectedCollection, setSelectedCollection] = React.useState<Collection | undefined>();
  const { providers } = useProviders(namespace);

  const benchmarkDetailsMap = React.useMemo(() => {
    const map = new Map<string, BenchmarkWithProvider>();
    providers.forEach((provider) => {
      (provider.benchmarks ?? []).forEach((benchmark) => {
        map.set(`${provider.resource.id}:${benchmark.id}`, {
          ...benchmark,
          providerName: provider.title ?? provider.name,
          providerAgent: provider.agent,
        });
      });
    });
    return map;
  }, [providers]);

  const selectCollection = React.useCallback((collection: Collection) => {
    setSelectedCollection((current) =>
      current?.resource.id === collection.resource.id ? undefined : collection,
    );
  }, []);

  const closeDrawer = React.useCallback(() => {
    setSelectedCollection(undefined);
  }, []);

  return { selectedCollection, benchmarkDetailsMap, selectCollection, closeDrawer };
};
