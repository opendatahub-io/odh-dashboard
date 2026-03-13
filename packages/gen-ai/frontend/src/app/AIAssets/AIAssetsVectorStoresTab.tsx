import * as React from 'react';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import useFetchAAEVectorStores from '~/app/hooks/useFetchAAEVectorStores';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useMergedModels from '~/app/hooks/useMergedModels';
import NoData from '~/app/EmptyStates/NoData';
import VectorStoresTable from '~/app/AIAssets/components/vectorstores/VectorStoresTable';

const AIAssetsVectorStoresTab: React.FC = () => {
  const { data: vectorStores = [], loaded, error } = useFetchAAEVectorStores();
  const { data: playgroundModels } = useFetchLlamaModels();
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
      <>
        <Alert
          variant="warning"
          isInline
          title="Vector store configuration not found"
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        >
          The vector stores ConfigMap was not found in this namespace. Ask your cluster
          administrator to create the <b>gen-ai-aa-vector-stores</b> ConfigMap to register external
          vector stores.
        </Alert>
        <VectorStoresTable
          vectorStores={[]}
          allModels={allModels}
          playgroundModels={playgroundModels}
        />
      </>
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
