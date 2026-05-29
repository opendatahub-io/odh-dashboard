import * as React from 'react';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import useFetchAAEVectorStores from '~/app/hooks/useFetchAAEVectorStores';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import useMergedModels from '~/app/hooks/useMergedModels';
import NoData from '~/app/EmptyStates/NoData';
import VectorStoresTable from '~/app/AIAssets/components/vectorstores/VectorStoresTable';

const AIAssetsVectorStoresTab: React.FC = () => {
  const { data: vectorStores = [], loaded, error } = useFetchAAEVectorStores();
  const { data: lsdStatus } = useFetchLSDStatus();
  const [existingCollections] = useFetchVectorStores();
  // load embedding models from llamastack to check which are "registered"
  // Note: this may fail when no LSD exists — the table still renders with playgroundModels=[]
  // and computeEmbeddingModelStatus handles the no-LSD case for the default embedding model.
  const { data: playgroundModels, error: playgroundModelsError } = useFetchLlamaModels(
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
        title="Unable to load vector stores"
        description="We were unable to load vector stores. Try contacting your cluster administrator to ensure the vector store configuration has been added for this playground."
      />
    );
  }

  if (vectorStores.length === 0) {
    return (
      <NoData
        title="No vector stores available"
        description="Contact your cluster administrator to add a vector store configuration."
      />
    );
  }

  return (
    <>
      {playgroundModelsError && (
        <Alert
          variant="warning"
          isInline
          title="Playground model status unavailable"
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        >
          Embedding model registration status could not be loaded. Vector stores are shown, but
          playground availability may be inaccurate.
        </Alert>
      )}
      <VectorStoresTable
        vectorStores={vectorStores}
        collectionsLoaded={loaded}
        allModels={allModels}
        playgroundModels={playgroundModels}
        lsdStatus={lsdStatus}
        existingCollections={existingCollections}
      />
    </>
  );
};

export default AIAssetsVectorStoresTab;
