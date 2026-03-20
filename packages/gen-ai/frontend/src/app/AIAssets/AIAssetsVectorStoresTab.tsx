import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import useFetchAAEVectorStores from '~/app/hooks/useFetchAAEVectorStores';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useMergedModels from '~/app/hooks/useMergedModels';
import NoData from '~/app/EmptyStates/NoData';
import VectorStoresTable from '~/app/AIAssets/components/vectorstores/VectorStoresTable';

const AIAssetsVectorStoresTab: React.FC = () => {
  const { data: vectorStores = [], loaded, error } = useFetchAAEVectorStores();
  // below we include embedding models as that allows checking & displaying
  // which embedding models are registered in llamastack
  const { data: playgroundModels } = useFetchLlamaModels(
    undefined, // lsdNotReady
    true, // includeEmbeddingModels
  );
  const { models: allModels } = useMergedModels();

  if (!loaded && !error) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <NoData
        title="No vector store configuration found"
        description="This playground does not have a vector store configuration. Contact your cluster administrator to add vector stores."
      />
    );
  }

  if (vectorStores.length === 0) {
    return (
      <NoData
        title="No vector stores available"
        description="A vector store configuration exists, but no vector stores were found. Contact your cluster administrator to update the configuration."
      />
    );
  }

  return (
    <VectorStoresTable
      vectorStores={vectorStores}
      allModels={allModels}
      playgroundModels={playgroundModels}
    />
  );
};

export default AIAssetsVectorStoresTab;
