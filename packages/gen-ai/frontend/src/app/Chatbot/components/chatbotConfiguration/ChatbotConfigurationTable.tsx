import * as React from 'react';
import { DashboardEmptyTableView, Table, useCheckboxTableBase } from 'mod-arch-shared';
import {
  Content,
  Flex,
  SearchInput,
  Stack,
  StackItem,
  Title,
  ToolbarItem,
} from '@patternfly/react-core';
import { AIModel } from '~/app/types';
import { chatbotConfigurationColumns } from './columns';
import ChatbotConfigurationTableRow from './ChatbotConfigurationTableRow';

type ChatbotConfigurationTableProps = {
  allModels: AIModel[];
  selectedModels: AIModel[];
  setSelectedModels: React.Dispatch<React.SetStateAction<AIModel[]>>;
  modelTypeMap: Map<string, string>;
  onModelTypeChange: (modelName: string, value: string) => void;
  maxTokensMap: Map<string, number | undefined>;
  onMaxTokensChange: (modelName: string, value: number | undefined) => void;
  embeddingDimensionMap: Map<string, number | undefined>;
  onEmbeddingDimensionChange: (modelName: string, value: number | undefined) => void;
  lockedModelNames: Set<string>;
};

const ChatbotConfigurationTable: React.FC<ChatbotConfigurationTableProps> = ({
  allModels,
  selectedModels,
  setSelectedModels,
  modelTypeMap,
  onModelTypeChange,
  maxTokensMap,
  onMaxTokensChange,
  embeddingDimensionMap,
  onEmbeddingDimensionChange,
  lockedModelNames,
}) => {
  // Composite key that is unique across models sharing the same model_id but
  // with different model_source_types (e.g. a namespace model and a MaaS model
  // for the same underlying model). Used for both checkbox tracking and React keys.
  const getModelKey = React.useCallback(
    (model: AIModel) => `${model.model_source_type}-${model.model_id}`,
    [],
  );

  const { tableProps, isSelected, toggleSelection } = useCheckboxTableBase<AIModel>(
    allModels,
    selectedModels,
    setSelectedModels,
    getModelKey,
  );

  const [search, setSearch] = React.useState('');
  const filteredModels = React.useMemo(
    () =>
      allModels.filter((model) => model.display_name.toLowerCase().includes(search.toLowerCase())),
    [allModels, search],
  );

  const availableModels = React.useMemo(
    () => filteredModels.filter((model) => model.status === 'Running'),
    [filteredModels],
  );

  const selectedModelKeys = selectedModels.map(getModelKey);
  const availableModelKeys = availableModels.map(getModelKey);

  const isAllSelected =
    availableModels.length > 0 &&
    availableModelKeys.every((key) => selectedModelKeys.includes(key));

  const handleSelectAll = (value: boolean) => {
    setSelectedModels((prev) => {
      const availableKeys = new Set(availableModels.map(getModelKey));

      if (value) {
        const byKey = new Map(prev.map((m) => [getModelKey(m), m]));
        availableModels.forEach((m) => byKey.set(getModelKey(m), m));
        return Array.from(byKey.values());
      }

      // Remove filtered models but keep locked ones.
      // Build locked keys by composite key so a MaaS/namespace model sharing the
      // same model_name as a locked embedding model isn't accidentally preserved.
      const lockedModelKeys = new Set(
        availableModels.filter((m) => lockedModelNames.has(m.model_name)).map(getModelKey),
      );
      return prev.filter(
        (m) => !availableKeys.has(getModelKey(m)) || lockedModelKeys.has(getModelKey(m)),
      );
    });
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h2" size="md">
          Available models
        </Title>
      </StackItem>
      <StackItem>
        <Table
          {...tableProps}
          toolbarContent={
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <ToolbarItem style={{ minWidth: '350px' }}>
                <SearchInput
                  aria-label="Search by model name"
                  placeholder="Find by name"
                  onChange={(_, value) => setSearch(value)}
                  onClear={() => setSearch('')}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Content component="small">
                  {selectedModels.length} out of {allModels.length} selected
                </Content>
              </ToolbarItem>
            </Flex>
          }
          defaultSortColumn={1}
          enablePagination
          data={filteredModels}
          columns={chatbotConfigurationColumns}
          rowRenderer={(model) => (
            <ChatbotConfigurationTableRow
              key={getModelKey(model)}
              isChecked={isSelected(model)}
              onToggleCheck={() => toggleSelection(model)}
              isLocked={lockedModelNames.has(model.model_name)}
              model={model}
              modelType={
                modelTypeMap.get(model.model_name) ??
                (model.model_type === 'embedding' ? 'Embedding' : 'Inference')
              }
              onModelTypeChange={(value) => onModelTypeChange(model.model_name, value)}
              maxTokens={maxTokensMap.get(model.model_name)}
              onMaxTokensChange={(value) => onMaxTokensChange(model.model_name, value)}
              embeddingDimension={
                embeddingDimensionMap.has(model.model_name)
                  ? embeddingDimensionMap.get(model.model_name)
                  : model.embedding_dimension
              }
              onEmbeddingDimensionChange={(value) =>
                onEmbeddingDimensionChange(model.model_name, value)
              }
            />
          )}
          selectAll={{
            disabled: filteredModels.length === 0,
            onSelect: handleSelectAll,
            selected: isAllSelected,
            tooltip: 'Select all models',
          }}
          emptyTableView={<DashboardEmptyTableView onClearFilters={() => setSearch('')} />}
          data-testid="chatbot-configuration-table"
        />
      </StackItem>
    </Stack>
  );
};

export default ChatbotConfigurationTable;
