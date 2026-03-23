import { SortableData } from 'mod-arch-shared';
import { ExternalVectorStoreSummary } from '~/app/types';

const VectorStoreColumns: SortableData<ExternalVectorStoreSummary>[] = [
  {
    field: 'vector_store_name',
    label: 'Collection name',
    info: { tooltip: 'The collection name and its parent vector store' },
    sortable: (a, b) => a.vector_store_name.localeCompare(b.vector_store_name),
    width: 20,
  },
  {
    field: 'embedding_model',
    label: 'Embedding model',
    info: { tooltip: 'The embedding model used to generate vector stores for this collection' },
    sortable: false,
    width: 25,
  },
  {
    field: 'embedding_dimension',
    label: 'Dimensions',
    info: { tooltip: 'The number of dimensions in the embedding vector' },
    sortable: false,
    width: 10,
  },
  {
    field: 'playground',
    label: 'Playground',
    sortable: false,
    width: 15,
  },
];

export default VectorStoreColumns;
