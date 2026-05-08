import * as React from 'react';
import {
  CheckboxTd,
  checkboxTableColumn,
  DashboardEmptyTableView,
  SortableData,
  Table,
  useCheckboxTableBase,
} from 'mod-arch-shared';
import {
  Content,
  Flex,
  Icon,
  SearchInput,
  Stack,
  StackItem,
  Title,
  ToolbarItem,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import { ExternalVectorStoreSummary } from '~/app/types';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { splitLlamaModelId } from '~/app/utilities/utils';

const collectionsColumns: SortableData<ExternalVectorStoreSummary>[] = [
  checkboxTableColumn(),
  {
    label: 'Collection name',
    field: 'vector_store_name',
    sortable: (a, b) => a.vector_store_name.localeCompare(b.vector_store_name),
    width: 40,
  },
  {
    label: 'Embedding model',
    field: 'embedding_model',
    sortable: (a, b) => a.embedding_model.localeCompare(b.embedding_model),
    width: 40,
  },
  {
    label: 'Dimensions',
    field: 'embedding_dimension',
    sortable: (a, b) => a.embedding_dimension - b.embedding_dimension,
    width: 20,
  },
];

type ChatbotConfigurationCollectionsTableProps = {
  allCollections: ExternalVectorStoreSummary[];
  selectedCollections: ExternalVectorStoreSummary[];
  setSelectedCollections: React.Dispatch<React.SetStateAction<ExternalVectorStoreSummary[]>>;
};

const ChatbotConfigurationCollectionsTable: React.FC<ChatbotConfigurationCollectionsTableProps> = ({
  allCollections,
  selectedCollections,
  setSelectedCollections,
}) => {
  const { tableProps, isSelected, toggleSelection } =
    useCheckboxTableBase<ExternalVectorStoreSummary>(
      allCollections,
      selectedCollections,
      setSelectedCollections,
      React.useCallback((collection) => collection.vector_store_id, []),
    );

  const { data: lsdModels } = useFetchLlamaModels(undefined, true); // include embedding models

  const isEmbeddingModelInLSD = React.useCallback(
    (embeddingModel: string): boolean => {
      const { id: normalizedId } = splitLlamaModelId(embeddingModel);
      return lsdModels.some((m) => m.modelId === embeddingModel || m.modelId === normalizedId);
    },
    [lsdModels],
  );

  const [search, setSearch] = React.useState('');
  const filteredCollections = React.useMemo(
    () =>
      allCollections.filter((c) =>
        c.vector_store_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [allCollections, search],
  );

  const selectedIds = selectedCollections.map((c) => c.vector_store_id);
  const filteredIds = filteredCollections.map((c) => c.vector_store_id);
  const isAllSelected =
    filteredCollections.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const handleSelectAll = (value: boolean) => {
    setSelectedCollections((prev) => {
      const filteredSet = new Set(filteredCollections.map((c) => c.vector_store_id));
      if (value) {
        const byId = new Map(prev.map((c) => [c.vector_store_id, c]));
        filteredCollections.forEach((c) => byId.set(c.vector_store_id, c));
        return Array.from(byId.values());
      }
      return prev.filter((c) => !filteredSet.has(c.vector_store_id));
    });
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h2" size="md">
          Select vector stores
        </Title>
      </StackItem>
      <StackItem>
        <Table
          {...tableProps}
          toolbarContent={
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <ToolbarItem style={{ minWidth: '350px' }}>
                <SearchInput
                  aria-label="Search by collection name"
                  placeholder="Find by name"
                  onChange={(_, value) => setSearch(value)}
                  onClear={() => setSearch('')}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Content component="small">
                  {selectedCollections.length} out of {allCollections.length} selected
                </Content>
              </ToolbarItem>
            </Flex>
          }
          defaultSortColumn={1}
          enablePagination
          data={filteredCollections}
          columns={collectionsColumns}
          rowRenderer={(collection) => {
            const sanitizedId = collection.vector_store_id.replace(/[^a-zA-Z0-9-]/g, '');
            return (
              <Tr key={collection.vector_store_id}>
                <CheckboxTd
                  id={collection.vector_store_id}
                  isChecked={isSelected(collection)}
                  onToggle={() => toggleSelection(collection)}
                  data-testid={`${sanitizedId}-checkbox`}
                />
                <Td dataLabel="Collection name">
                  <div>
                    <strong>{collection.vector_store_name}</strong>
                    {collection.description && (
                      <div>
                        <Content
                          component="small"
                          style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                        >
                          {collection.description}
                        </Content>
                      </div>
                    )}
                  </div>
                </Td>
                <Td dataLabel="Embedding model">
                  <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                    {collection.embedding_model}
                    {isEmbeddingModelInLSD(collection.embedding_model) && (
                      <Icon status="success" size="sm">
                        <CheckCircleIcon />
                      </Icon>
                    )}
                  </Flex>
                </Td>
                <Td dataLabel="Dimensions">{collection.embedding_dimension}</Td>
              </Tr>
            );
          }}
          selectAll={{
            disabled: filteredCollections.length === 0,
            onSelect: handleSelectAll,
            selected: isAllSelected,
            tooltip: 'Select all collections',
          }}
          emptyTableView={<DashboardEmptyTableView onClearFilters={() => setSearch('')} />}
          data-testid="chatbot-configuration-collections-table"
        />
      </StackItem>
    </Stack>
  );
};

export default ChatbotConfigurationCollectionsTable;
