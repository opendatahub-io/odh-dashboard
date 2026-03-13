import * as React from 'react';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { AIModel, ExternalVectorStoreSummary, LlamaModel } from '~/app/types';
import VectorStoreTableRow from './VectorStoreTableRow';
import VectorStoreColumns from './VectorStoreColumns';

interface VectorStoresTableProps {
  vectorStores: ExternalVectorStoreSummary[];
  allModels: AIModel[];
  playgroundModels: LlamaModel[];
}

const VectorStoresTable: React.FC<VectorStoresTableProps> = ({
  vectorStores,
  allModels,
  playgroundModels,
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
      />
    )}
    data-testid="vector-stores-table"
  />
);

export default VectorStoresTable;
