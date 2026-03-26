import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import {
  AIModel,
  ExternalVectorStoreSummary,
  LlamaModel,
  LlamaStackDistributionModel,
  VectorStore,
} from '~/app/types';
import VectorStoreTableRow from './VectorStoreTableRow';
import VectorStoreColumns from './VectorStoreColumns';

interface VectorStoresTableProps {
  vectorStores: ExternalVectorStoreSummary[];
  collectionsLoaded: boolean;
  allModels: AIModel[];
  playgroundModels: LlamaModel[];
  lsdStatus: LlamaStackDistributionModel | null;
  existingCollections: VectorStore[];
}

const VectorStoresTable: React.FC<VectorStoresTableProps> = ({
  vectorStores,
  collectionsLoaded,
  allModels,
  playgroundModels,
  lsdStatus,
  existingCollections,
}) => (
  <Table
    data={vectorStores}
    columns={VectorStoreColumns}
    enablePagination
    defaultSortColumn={0}
    emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
    rowRenderer={(store: ExternalVectorStoreSummary) => (
      <VectorStoreTableRow
        key={store.vector_store_id}
        store={store}
        allModels={allModels}
        playgroundModels={playgroundModels}
        lsdStatus={lsdStatus}
        allCollections={vectorStores}
        collectionsLoaded={collectionsLoaded}
        existingCollections={existingCollections}
      />
    )}
    data-testid="vector-stores-table"
  />
);

export default VectorStoresTable;
