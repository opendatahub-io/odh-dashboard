import { SortableData } from 'mod-arch-shared';
import { ExternalVectorStoreSummary } from '~/app/types';

const VectorStoreColumns: SortableData<ExternalVectorStoreSummary>[] = [
  {
    field: 'vector_store_name',
    label: 'Vector store name',
    sortable: (a, b) => a.vector_store_name.localeCompare(b.vector_store_name),
    width: 20,
  },
  {
    field: 'embedding_model',
    label: 'Embedding model',
    info: {
      popover: 'The embedding model used to generate vectors for this vector store.',
    },
    sortable: false,
    width: 25,
  },
  {
    field: 'embedding_dimension',
    label: 'Dimensions',
    info: {
      popover:
        'The number of values in each embedding vector. More dimensions capture more detail but use more memory and compute; fewer dimensions are faster and more efficient but might lose nuance.',
    },
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
